/**
 * Survey data: upload, live pipeline panel, mapping confirmation, quality report
 * and rollback. The pipeline panel is driven by websocket job events.
 */

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Circle, RotateCcw, Upload } from "lucide-react";
import { adminSurveysApi } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import { useSocketEvent } from "../../app/providers";
import { formatDateTime, formatNumber } from "../../lib/utils";
import { Badge, Button, Card, Field, Input, Select, Skeleton } from "../../components/ui";
import { useToast } from "../../components/Toast";
import type { JobDetail, SurveyRead } from "../../lib/api/types";

const STAGES = [
  "received",
  "validated",
  "mapped",
  "cleaned",
  "loaded",
  "aggregated",
  "scored",
  "completed",
] as const;

function PipelinePanel({ job }: { job: JobDetail }) {
  const { t } = useI18n();
  const currentIndex = STAGES.indexOf(job.stage as (typeof STAGES)[number]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Badge tone={job.status === "failed" ? "danger" : job.status === "completed" ? "success" : "warning"}>
          {job.status}
        </Badge>
        <span className="muted text-xs">{job.progress_percent}%</span>
      </div>

      <ol className="space-y-1.5">
        {STAGES.map((stage, index) => {
          const reached = currentIndex >= index;
          const failedHere = job.error_stage === stage;
          return (
            <li key={stage} className="flex items-center gap-2 text-sm">
              {failedHere ? (
                <AlertTriangle aria-hidden className="h-4 w-4 text-danger" />
              ) : reached ? (
                <CheckCircle2 aria-hidden className="h-4 w-4 text-primary-text" />
              ) : (
                <Circle aria-hidden className="h-4 w-4 text-ink-muted" />
              )}
              <span className={reached ? "" : "muted"}>{t(`admin.stage.${stage}`)}</span>
            </li>
          );
        })}
      </ol>

      {job.error_message ? (
        <p className="rounded-lg bg-danger-tint p-3 text-sm text-danger">
          {job.error_message}
          {job.error_code ? <span className="muted block text-xs">{job.error_code}</span> : null}
        </p>
      ) : null}

      <p className="muted text-xs">
        {formatNumber(job.rows_processed)} rows at {formatDateTime(job.created_at)}
      </p>

      <details>
        <summary className="cursor-pointer text-sm">{t("admin.survey.pipeline")}</summary>
        <ul className="mt-2 space-y-1 text-xs">
          {job.events.slice(-40).map((event) => (
            <li key={event.id} className="muted">
              {formatDateTime(event.created_at)} {event.type} {event.stage ?? ""}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

function MappingEditor({ jobId }: { jobId: string }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [updates, setUpdates] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const mapping = useQuery({
    queryKey: ["admin-mapping", jobId],
    queryFn: () => adminSurveysApi.mapping(jobId),
  });

  if (mapping.isLoading) return <Skeleton className="h-24" />;
  if (!mapping.data) return null;

  const rows = mapping.data.variables.filter((row) => row.platform_group !== "ignored");

  async function confirm() {
    setBusy(true);
    try {
      await adminSurveysApi.confirmMapping(
        jobId,
        Object.entries(updates).map(([variable_name, yes_code]) => ({ variable_name, yes_code })),
      );
      toast.push(t("admin.survey.mapping"), "success");
      void queryClient.invalidateQueries({ queryKey: ["admin-surveys"] });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">{t("admin.survey.mapping")}</h2>
        {mapping.data.confirmed ? <Badge tone="success">{t("common.done")}</Badge> : null}
      </div>
      {rows.length === 0 ? <p className="muted text-sm">{t("common.empty")}</p> : null}
      <ul className="max-h-72 space-y-2 overflow-y-auto">
        {rows.map((row) => (
          <li key={row.variable_name} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="min-w-0 flex-1 truncate font-mono text-xs">{row.variable_name}</span>
            <Badge tone="neutral">{row.platform_group}</Badge>
            <Select
              aria-label={`yes code for ${row.variable_name}`}
              className="w-32"
              value={updates[row.variable_name] ?? row.yes_code ?? ""}
              onChange={(event) => setUpdates((current) => ({ ...current, [row.variable_name]: event.target.value }))}
            >
              <option value="">-</option>
              <option value="1">1</option>
              <option value="2">2</option>
            </Select>
          </li>
        ))}
      </ul>
      <Button disabled={!Object.keys(updates).length} loading={busy} onClick={() => void confirm()}>
        {t("common.confirm")}
      </Button>
    </Card>
  );
}

export function SurveyDataScreen() {
  const { t, language } = useI18n();
  const queryClient = useQueryClient();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [activeJob, setActiveJob] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const surveys = useQuery({ queryKey: ["admin-surveys"], queryFn: () => adminSurveysApi.list() });
  const job = useQuery({
    queryKey: ["admin-job", activeJob],
    queryFn: () => adminSurveysApi.job(activeJob as string),
    enabled: Boolean(activeJob),
    refetchInterval: 4000,
  });

  useSocketEvent((message) => {
    if (message.type.startsWith("job.")) {
      void queryClient.invalidateQueries({ queryKey: ["admin-surveys"] });
      if (activeJob) void queryClient.invalidateQueries({ queryKey: ["admin-job", activeJob] });
    }
  });

  useEffect(() => {
    const latest = surveys.data?.items[0];
    if (!activeJob && latest) setActiveJob(null);
  }, [surveys.data, activeJob]);

  async function upload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const response = await adminSurveysApi.upload(file, { name: name || file.name, year, keep_file: "true" });
      setActiveJob(response.job.id);
      toast.push(`${response.survey.name}: ${response.job.status}`, "success");
      void queryClient.invalidateQueries({ queryKey: ["admin-surveys"] });
    } catch (caught) {
      toast.push(caught instanceof Error ? caught.message : t("common.error"), "warning");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{t("admin.survey.title")}</h1>

      <Card className="space-y-3">
        <h2 className="flex items-center gap-2 font-semibold">
          <Upload aria-hidden className="h-4 w-4 text-primary-text" />
          {t("admin.survey.upload")}
        </h2>
        <Field label={t("admin.survey.name")} htmlFor="surveyName">
          <Input id="surveyName" value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label={t("admin.survey.year")} htmlFor="surveyYear" required>
          <Input id="surveyYear" type="number" value={year} onChange={(event) => setYear(event.target.value)} />
        </Field>
        <Field label=".dta file" htmlFor="surveyFile" required>
          <input
            id="surveyFile"
            ref={fileRef}
            type="file"
            accept=".dta"
            className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-primary-on"
          />
        </Field>
        <Button loading={busy} onClick={() => void upload()}>
          {t("admin.survey.upload")}
        </Button>
      </Card>

      {job.data ? (
        <Card>
          <PipelinePanel job={job.data} />
        </Card>
      ) : null}

      {job.data && job.data.stage === "mapped" ? <MappingEditor jobId={job.data.id} /> : null}

      <div className="space-y-2">
        <h2 className="font-semibold">{t("admin.survey.title")}</h2>
        {surveys.isLoading ? <Skeleton className="h-24" /> : null}
        <ul className="space-y-2">
          {surveys.data?.items.map((survey: SurveyRead) => (
            <li key={survey.id} className="card flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{survey.name}</p>
                <p className="muted text-xs">
                  {survey.year} - {formatNumber(survey.rows_raw)} rows - {formatDateTime(survey.created_at, language)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={survey.status === "completed" ? "success" : survey.status === "failed" ? "danger" : "neutral"}>
                  {survey.status}
                </Badge>
                <Button variant="ghost" onClick={() => setActiveJob(null)}>
                  {t("admin.survey.quality")}
                </Button>
                <Button
                  variant="danger"
                  icon={<RotateCcw aria-hidden className="h-4 w-4" />}
                  onClick={async () => {
                    await adminSurveysApi.remove(survey.id);
                    toast.push(t("admin.survey.rollback"), "success");
                    void queryClient.invalidateQueries({ queryKey: ["admin-surveys"] });
                  }}
                >
                  {t("admin.survey.rollback")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <QualityPanel surveyId={surveys.data?.items[0]?.id} />
    </div>
  );
}

function QualityPanel({ surveyId }: { surveyId?: string }) {
  const { t } = useI18n();
  const quality = useQuery({
    queryKey: ["admin-quality", surveyId],
    queryFn: () => adminSurveysApi.quality(surveyId as string),
    enabled: Boolean(surveyId),
    retry: false,
  });

  if (!surveyId || quality.isLoading || quality.isError || !quality.data) return null;
  const report = quality.data;

  return (
    <Card className="space-y-2">
      <h2 className="font-semibold">{t("admin.survey.quality")}</h2>
      <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
        {[
          ["rows_raw", report.rows_raw],
          ["rows_after_dedup", report.rows_after_dedup],
          ["duplicate_households", report.duplicate_households],
          ["duplicate_persons", report.duplicate_persons],
          ["households_loaded", report.households_loaded],
          ["persons_loaded", report.persons_loaded],
        ].map(([key, value]) => (
          <div key={String(key)}>
            <dt className="muted text-xs">{String(key)}</dt>
            <dd className="font-medium">{formatNumber(Number(value))}</dd>
          </div>
        ))}
      </dl>
      {report.warnings.length ? (
        <ul className="space-y-1 text-xs text-warning">
          {report.warnings.map((warning) => (
            <li key={warning} className="flex items-start gap-1">
              <AlertTriangle aria-hidden className="mt-0.5 h-3 w-3 shrink-0" />
              {warning}
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}

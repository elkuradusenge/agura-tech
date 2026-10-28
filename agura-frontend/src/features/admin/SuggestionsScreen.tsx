/**
 * AI suggestions. The engine proposes a ranking; a person decides. Weights are
 * adjustable and every recommendation carries its structured reason.
 */

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Info, Sparkles } from "lucide-react";
import { adminAiApi } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import { formatNumber, formatPercent } from "../../lib/utils";
import { Badge, Button, Card, Field, Input, Skeleton } from "../../components/ui";
import { useToast } from "../../components/Toast";
import type { RankingItem } from "../../lib/api/types";

const DEFAULT_WEIGHTS = { gap: 0.4, nutrition: 0.3, feasibility: 0.3 };

export function SuggestionsScreen() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [topN, setTopN] = useState(10);
  const [province, setProvince] = useState("");

  const latest = useQuery({
    queryKey: ["admin-ai", "latest", province],
    queryFn: () => adminAiApi.latest({ province: province || undefined }),
    retry: false,
  });

  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      await adminAiApi.run({ weights, top_n: topN, province: province || undefined });
      toast.push(t("admin.ai.rerun"), "success");
      void queryClient.invalidateQueries({ queryKey: ["admin-ai"] });
    } catch (caught) {
      toast.push(caught instanceof Error ? caught.message : t("common.error"), "warning");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{t("admin.ai.title")}</h1>

      <Card className="space-y-3">
        <p className="flex items-start gap-2 rounded-xl bg-primary-tint p-3 text-sm">
          <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-primary-text" />
          {t("admin.ai.peopleDecide")}
        </p>

        <h2 className="font-semibold">{t("admin.ai.weights")}</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {(["gap", "nutrition", "feasibility"] as const).map((key) => (
            <Field key={key} label={key} htmlFor={`weight-${key}`}>
              <input
                id={`weight-${key}`}
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={weights[key]}
                onChange={(event) => setWeights((current) => ({ ...current, [key]: Number(event.target.value) }))}
                className="w-full accent-primary"
              />
              <span className="muted text-xs">{weights[key].toFixed(2)}</span>
            </Field>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="top_n" htmlFor="topN">
            <Input id="topN" type="number" min={1} max={50} value={topN} onChange={(event) => setTopN(Number(event.target.value))} />
          </Field>
          <Field label="province" htmlFor="provinceFilter">
            <Input id="provinceFilter" value={province} onChange={(event) => setProvince(event.target.value)} />
          </Field>
        </div>

        <Button loading={busy} icon={<Sparkles aria-hidden className="h-4 w-4" />} onClick={() => void run()}>
          {t("admin.ai.rerun")}
        </Button>
      </Card>

      {latest.isLoading ? <Skeleton className="h-48" /> : null}

      {latest.data ? (
        <Card className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold">{t("admin.ai.title")}</h2>
            <Badge tone={latest.data.status === "completed" ? "success" : "warning"}>{latest.data.status}</Badge>
            {latest.data.cluster_count ? <Badge tone="info">k={latest.data.cluster_count}</Badge> : null}
            {latest.data.silhouette !== null ? (
              <Badge tone="neutral">silhouette {latest.data.silhouette.toFixed(2)}</Badge>
            ) : null}
          </div>

          {latest.data.warnings.length ? (
            <ul className="space-y-1 text-xs text-warning">
              {latest.data.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}

          <ol className="space-y-2">
            {latest.data.items.map((item: RankingItem) => (
              <li key={`${item.rank}-${item.food_item_id}`} className="rounded-xl bg-surface-raised p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">
                    {item.rank}. {item.standard_name ?? item.food_item_id}
                  </span>
                  {item.pinned ? <Badge tone="success">pinned</Badge> : null}
                  {item.cluster_label ? <Badge tone="neutral">{item.cluster_label}</Badge> : null}
                  <span className="muted ml-auto text-xs">
                    gap {item.gap_score === null ? "-" : formatPercent(item.gap_score, 0)} - nutrition{" "}
                    {item.nutrition_value === null ? "-" : formatNumber(item.nutrition_value)} - feasibility{" "}
                    {item.feasibility === null ? "-" : formatPercent(item.feasibility, 0)}
                  </span>
                </div>
                <p className="muted mt-1 text-sm">{item.explanation}</p>
                {item.province ? <p className="muted text-xs">{item.province}</p> : null}
              </li>
            ))}
          </ol>
        </Card>
      ) : latest.isError ? (
        <Card>
          <p className="muted text-sm">{t("admin.ai.notice")}</p>
        </Card>
      ) : null}
    </div>
  );
}

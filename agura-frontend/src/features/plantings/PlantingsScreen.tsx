/** My plantings and one planting's detail with its task timeline. */

import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, PauseCircle, Sprout } from "lucide-react";
import { harvestsApi, plantingsApi, tasksApi } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import { formatDate, formatKigaliTime } from "../../lib/utils";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Input,
  ProgressBar,
  Select,
  Skeleton,
} from "../../components/ui";
import { useState } from "react";

export function PlantingsScreen() {
  const { t, language } = useI18n();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["plantings"],
    queryFn: () => plantingsApi.list(),
  });

  if (isLoading) return <Skeleton className="h-40" />;
  if (isError)
    return <ErrorState title={t("common.error")} retryLabel={t("common.retry")} onRetry={() => void refetch()} />;
  if (!data?.items.length)
    return <EmptyState title={t("plantings.none")} icon={<Sprout aria-hidden className="h-8 w-8 text-primary-text" />} />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("plantings.title")}</h1>
      <ul className="grid gap-3 sm:grid-cols-2">
        {data.items.map((planting) => (
          <li key={planting.id}>
            <Link to={`/app/plantings/${planting.id}`}>
              <Card className="space-y-2 transition hover:border-primary">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold">{planting.product_name_rw ?? planting.product_name_en}</h2>
                  <Badge tone={planting.status === "active" ? "success" : "neutral"}>
                    {planting.status === "active"
                      ? t("status.trackable")
                      : planting.status === "paused"
                        ? t("status.paused")
                        : t("common.done")}
                  </Badge>
                </div>
                <ProgressBar value={planting.progress_percent} label={t("plantings.progress")} />
                <p className="muted flex justify-between text-xs">
                  <span>
                    {t("plantings.daysLeft")}: {planting.days_left ?? "-"}
                  </span>
                  <span>{planting.progress_percent}%</span>
                </p>
                {planting.next_task ? (
                  <p className="text-xs">
                    <Clock aria-hidden className="mr-1 inline h-3.5 w-3.5" />
                    {formatDate(planting.next_task.due_at, language)} {formatKigaliTime(planting.next_task.due_at)}
                  </p>
                ) : null}
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PlantingDetailScreen() {
  const { id } = useParams();
  const { t, language } = useI18n();
  const queryClient = useQueryClient();
  const [harvestKg, setHarvestKg] = useState("");
  const [usedFor, setUsedFor] = useState("eaten");

  const { data, isLoading } = useQuery({
    queryKey: ["plantings", id],
    queryFn: () => plantingsApi.detail(id as string),
    enabled: Boolean(id),
  });

  const updateStatus = useMutation({
    mutationFn: (status: string) => plantingsApi.update(id as string, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["plantings"] });
    },
  });

  const recordHarvest = useMutation({
    mutationFn: () =>
      harvestsApi.create({
        planting_id: id as string,
        quantity_kg: Number(harvestKg) || undefined,
        used_for: usedFor,
      }),
    onSuccess: () => {
      setHarvestKg("");
      void queryClient.invalidateQueries({ queryKey: ["plantings", id] });
      void queryClient.invalidateQueries({ queryKey: ["harvests"] });
    },
  });

  if (isLoading) return <Skeleton className="h-64" />;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{data.product_name_rw ?? data.product_name_en}</h1>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            icon={<PauseCircle aria-hidden className="h-4 w-4" />}
            loading={updateStatus.isPending}
            onClick={() => updateStatus.mutate("paused")}
          >
            {t("plantings.pause")}
          </Button>
          <Button variant="warning" loading={updateStatus.isPending} onClick={() => updateStatus.mutate("finished")}>
            {t("plantings.finish")}
          </Button>
        </div>
      </header>

      <Card className="space-y-2">
        <ProgressBar value={data.progress_percent} label={t("plantings.progress")} />
        <p className="muted flex justify-between text-xs">
          <span>
            {t("plantings.stage")}: {data.status}
          </span>
          <span>
            {t("plantings.daysLeft")}: {data.days_left ?? "-"}
          </span>
        </p>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">{t("harvest.title")}</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <Field label={t("harvest.quantity")} htmlFor="harvestKg">
            <Input
              id="harvestKg"
              type="number"
              min={0}
              step="0.1"
              value={harvestKg}
              onChange={(event) => setHarvestKg(event.target.value)}
            />
          </Field>
          <Field label={t("harvest.usedFor")} htmlFor="usedFor">
            <Select id="usedFor" value={usedFor} onChange={(event) => setUsedFor(event.target.value)}>
              <option value="eaten">{t("harvest.eaten")}</option>
              <option value="sold">{t("harvest.sold")}</option>
              <option value="preserved">{t("harvest.preserved")}</option>
            </Select>
          </Field>
        </div>
        <Button loading={recordHarvest.isPending} onClick={() => recordHarvest.mutate()}>
          {t("common.save")}
        </Button>
      </Card>

      <div>
        <h2 className="mb-2 font-semibold">{t("products.schedule")}</h2>
        <ol className="space-y-2">
          {data.tasks.slice(0, 40).map((task) => (
            <li key={task.id} className="card flex items-center justify-between gap-3">
              <span className="text-sm">
                <Badge tone={task.status === "done" ? "success" : task.status === "missed" ? "warning" : "neutral"}>
                  {task.status}
                </Badge>{" "}
                {task.instruction_text}
              </span>
              <span className="muted shrink-0 text-xs">
                {formatDate(task.due_at, language)} {formatKigaliTime(task.due_at)}
              </span>
              {task.status === "pending" ? (
                <Button
                  variant="ghost"
                  onClick={async () => {
                    await tasksApi.done(task.id);
                    void queryClient.invalidateQueries({ queryKey: ["plantings", id] });
                    void queryClient.invalidateQueries({ queryKey: ["tasks"] });
                  }}
                >
                  {t("common.done")}
                </Button>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

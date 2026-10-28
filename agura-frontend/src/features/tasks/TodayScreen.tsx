/** Today: morning and evening task groups. */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Moon, Sunrise } from "lucide-react";
import { tasksApi } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import { formatKigaliTime } from "../../lib/utils";
import { Badge, Card, EmptyState, ErrorState, Skeleton } from "../../components/ui";
import type { TaskRead } from "../../lib/api/types";

function TaskRow({ task }: { task: TaskRead }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  async function complete() {
    await tasksApi.done(task.id);
    void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    void queryClient.invalidateQueries({ queryKey: ["plantings"] });
  }

  return (
    <li className="card flex items-start gap-3">
      <button
        type="button"
        aria-label={`${t("common.done")}: ${task.instruction_text}`}
        className="tap-target mt-0.5 shrink-0 rounded-full p-2"
        onClick={() => void complete()}
        disabled={task.status !== "pending"}
      >
        <CheckCircle2
          aria-hidden
          className={task.status === "done" ? "h-6 w-6 text-primary-text" : "h-6 w-6 text-ink-muted"}
        />
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{task.instruction_text}</p>
        <p className="muted text-xs">
          {task.task_type.replace(/_/g, " ")} - {formatKigaliTime(task.due_at)}
        </p>
        {task.is_urgent ? <Badge tone="warning">{t("tasks.followUp")}</Badge> : null}
      </div>
    </li>
  );
}

export function TodayScreen() {
  const { t } = useI18n();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["tasks", "today"],
    queryFn: () => tasksApi.today(),
  });

  if (isLoading)
    return (
      <div className="space-y-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  if (isError)
    return <ErrorState title={t("common.error")} retryLabel={t("common.retry")} onRetry={() => void refetch()} />;

  const morning = data?.morning ?? [];
  const evening = data?.evening ?? [];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{t("tasks.today")}</h1>

      <section aria-labelledby="morningHeading" className="space-y-2">
        <h2 id="morningHeading" className="flex items-center gap-2 font-semibold">
          <Sunrise aria-hidden className="h-5 w-5 text-warning" />
          {t("tasks.morning")}
        </h2>
        {morning.length ? (
          <ul className="space-y-2">
            {morning.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </ul>
        ) : (
          <Card>
            <p className="muted text-sm">{t("tasks.none")}</p>
          </Card>
        )}
      </section>

      <section aria-labelledby="eveningHeading" className="space-y-2">
        <h2 id="eveningHeading" className="flex items-center gap-2 font-semibold">
          <Moon aria-hidden className="h-5 w-5 text-ink-muted" />
          {t("tasks.evening")}
        </h2>
        {evening.length ? (
          <ul className="space-y-2">
            {evening.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </ul>
        ) : (
          <Card>
            <p className="muted text-sm">{t("tasks.none")}</p>
          </Card>
        )}
      </section>

      {!morning.length && !evening.length ? (
        <EmptyState title={t("tasks.none")} icon={<CheckCircle2 aria-hidden className="h-8 w-8 text-primary-text" />} />
      ) : null}
    </div>
  );
}

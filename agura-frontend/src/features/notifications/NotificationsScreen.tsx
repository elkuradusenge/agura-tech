import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { notificationsApi } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import { formatDate, formatKigaliTime } from "../../lib/utils";
import { Badge, EmptyState, ErrorState, Skeleton } from "../../components/ui";

export function NotificationsScreen() {
  const { t, language } = useI18n();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.list(),
  });

  if (isLoading) return <Skeleton className="h-40" />;
  if (isError)
    return <ErrorState title={t("common.error")} retryLabel={t("common.retry")} onRetry={() => void refetch()} />;
  if (!data?.items.length)
    return <EmptyState title={t("notifications.none")} icon={<Bell aria-hidden className="h-8 w-8 text-primary-text" />} />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("notifications.title")}</h1>
      <ul className="space-y-2">
        {data.items.map((item) => {
          const params = item.params as Record<string, string | number>;
          // The server renders the admin edited template, so prefer it and only
          // fall back to the shipped dictionary when it is missing.
          const title = item.title ?? t(item.title_translation_key, params);
          const body = item.body ?? t(item.body_translation_key, params);
          return (
            <li key={item.id}>
              <button
                type="button"
                className="card w-full space-y-1 text-left"
                onClick={async () => {
                  if (item.read_at !== null) return;
                  await notificationsApi.markRead(item.id);
                  void queryClient.invalidateQueries({ queryKey: ["notifications"] });
                }}
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium">{title}</span>
                  {item.read_at === null ? <Badge tone="success">{t("notifications.unread")}</Badge> : null}
                </span>
                <span className="muted block text-sm">{body}</span>
                <span className="muted block text-xs">
                  {formatDate(item.created_at, language)} {formatKigaliTime(item.created_at)}
                  {item.sms_sent ? ` - ${t("notifications.smsSent")}` : ""}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

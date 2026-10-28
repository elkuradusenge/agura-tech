/** Admin dashboard: the numbers the team checks every morning. */

import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Leaf, MessageSquare, Sprout, TrendingUp, Users } from "lucide-react";
import { adminMonitoringApi } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import { formatNumber, formatPercent } from "../../lib/utils";
import { Card, ErrorState, Skeleton } from "../../components/ui";
import { FunnelBarChart, TrendLineChart } from "../../components/charts";

export function DashboardScreen() {
  const { t } = useI18n();
  const overview = useQuery({ queryKey: ["admin-monitoring", "overview"], queryFn: adminMonitoringApi.overview });
  const funnel = useQuery({ queryKey: ["admin-monitoring", "funnel"], queryFn: adminMonitoringApi.funnel });
  const signups = useQuery({ queryKey: ["admin-monitoring", "signups"], queryFn: adminMonitoringApi.signups });

  if (overview.isLoading) return <Skeleton className="h-64" />;
  if (overview.isError || !overview.data)
    return (
      <ErrorState
        title={t("common.error")}
        retryLabel={t("common.retry")}
        onRetry={() => void overview.refetch()}
      />
    );

  const data = overview.data;

  const tiles = [
    {
      label: t("admin.dashboard.farmers"),
      value: `${formatNumber(data.users.active)} / ${formatNumber(data.users.total)}`,
      icon: <Users aria-hidden className="h-5 w-5 text-primary-text" />,
    },
    {
      label: t("admin.dashboard.plantings"),
      value: `${formatNumber(data.plantings.active)} / ${formatNumber(data.plantings.total)}`,
      icon: <Sprout aria-hidden className="h-5 w-5 text-primary-text" />,
    },
    {
      label: t("admin.dashboard.completion"),
      value: formatPercent(data.tasks.completion_rate),
      icon: <ClipboardList aria-hidden className="h-5 w-5 text-primary-text" />,
    },
    {
      label: t("admin.dashboard.reminders"),
      value: `${formatNumber(data.reminders.sms_sent)} / ${formatNumber(data.reminders.created)}`,
      icon: <TrendingUp aria-hidden className="h-5 w-5 text-primary-text" />,
    },
    {
      label: t("admin.dashboard.openRequests"),
      value: formatNumber(data.specialist_requests.open),
      icon: <MessageSquare aria-hidden className="h-5 w-5 text-primary-text" />,
    },
    {
      label: t("admin.products.title"),
      value: formatNumber(data.products.trackable),
      icon: <Leaf aria-hidden className="h-5 w-5 text-primary-text" />,
    },
  ];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{t("admin.dashboard.title")}</h1>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((tile) => (
          <li key={tile.label}>
            <Card className="space-y-1">
              <p className="muted flex items-center gap-2 text-xs">
                {tile.icon}
                {tile.label}
              </p>
              <p className="text-2xl font-bold">{tile.value}</p>
            </Card>
          </li>
        ))}
      </ul>

      <Card className="space-y-2">
        <h2 className="font-semibold">{t("admin.monitoring.funnel")}</h2>
        {funnel.data ? (
          <FunnelBarChart
            data={funnel.data.stages.map((stage) => ({ label: stage.key, value: stage.count }))}
          />
        ) : (
          <Skeleton className="h-48" />
        )}
      </Card>

      <Card className="space-y-2">
        <h2 className="font-semibold">Sign ups</h2>
        {signups.data ? (
          <TrendLineChart
            data={signups.data.series.map((point) => ({ label: point.date.slice(5), value: point.count }))}
          />
        ) : (
          <Skeleton className="h-48" />
        )}
      </Card>
    </div>
  );
}

/** Monitoring: reminders health, failed SMS, and a manual reminder pass. */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PlayCircle } from "lucide-react";
import { adminMonitoringApi } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import { formatDateTime } from "../../lib/utils";
import { Badge, Button, Card, Skeleton } from "../../components/ui";
import { useToast } from "../../components/Toast";
import { useState } from "react";

interface SmsRow {
  id: string;
  phone: string;
  status: string;
  error_code: string | null;
  created_at: string;
}

export function MonitoringScreen() {
  const { t, language } = useI18n();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const overview = useQuery({ queryKey: ["admin-monitoring", "overview"], queryFn: adminMonitoringApi.overview });
  const failures = useQuery({
    queryKey: ["admin-monitoring", "sms"],
    queryFn: () => adminMonitoringApi.smsFailures({ status: "failed" }),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("admin.monitoring.title")}</h1>

      {overview.isLoading ? <Skeleton className="h-32" /> : null}
      {overview.data ? (
        <Card className="space-y-1">
          <h2 className="font-semibold">{t("admin.dashboard.reminders")}</h2>
          <p className="text-sm">
            created {overview.data.reminders.created} - sent {overview.data.reminders.sms_sent} - failed{" "}
            {overview.data.reminders.sms_failed}
          </p>
        </Card>
      ) : null}

      <Card className="space-y-2">
        <h2 className="font-semibold">{t("admin.monitoring.smsFailures")}</h2>
        <Button
          variant="secondary"
          loading={busy}
          icon={<PlayCircle aria-hidden className="h-4 w-4" />}
          onClick={async () => {
            setBusy(true);
            try {
              const result = await adminMonitoringApi.runReminders();
              toast.push(JSON.stringify(result), "success");
              void queryClient.invalidateQueries({ queryKey: ["admin-monitoring"] });
            } finally {
              setBusy(false);
            }
          }}
        >
          {t("common.refresh")}
        </Button>

        {failures.isLoading ? <Skeleton className="h-24" /> : null}
        {failures.data?.items.length ? (
          <ul className="space-y-1 text-sm">
            {(failures.data.items as unknown as SmsRow[]).map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-2 border-b border-line py-1 ">
                <span>{row.phone}</span>
                <Badge tone="danger">{row.error_code ?? row.status}</Badge>
                <span className="muted text-xs">{formatDateTime(row.created_at, language)}</span>
              </li>
            ))}
          </ul>
        ) : !failures.isLoading ? (
          <p className="muted text-sm">{t("common.empty")}</p>
        ) : null}
      </Card>
    </div>
  );
}

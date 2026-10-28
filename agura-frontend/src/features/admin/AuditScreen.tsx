/** Audit log: who changed what, newest first. */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { adminSupportApi } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import { formatDateTime } from "../../lib/utils";
import { Button, Field, Input, Skeleton } from "../../components/ui";

interface AuditRow {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  actor_label: string | null;
  created_at: string;
  details: Record<string, unknown> | null;
}

export function AuditScreen() {
  const { t, language } = useI18n();
  const [action, setAction] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-audit", action],
    queryFn: () => adminSupportApi.auditLog({ action: action || undefined }),
  });

  const rows = (data?.items ?? []) as unknown as AuditRow[];

  function download() {
    const header = "created_at,actor,action,entity_type,entity_id\n";
    const body = rows
      .map((row) =>
        [row.created_at, row.actor_label ?? "", row.action, row.entity_type ?? "", row.entity_id ?? ""].join(","),
      )
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "audit-log.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-2xl font-bold">{t("admin.audit.title")}</h1>
        <Button variant="secondary" icon={<Download aria-hidden className="h-4 w-4" />} onClick={download} disabled={!rows.length}>
          CSV
        </Button>
      </div>

      <Field label={t("common.search")} htmlFor="auditAction">
        <Input id="auditAction" value={action} onChange={(event) => setAction(event.target.value)} />
      </Field>

      {isLoading ? <Skeleton className="h-40" /> : null}

      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">{t("admin.audit.title")}</caption>
            <thead>
              <tr className="text-left">
                <th scope="col">When</th>
                <th scope="col">Actor</th>
                <th scope="col">Action</th>
                <th scope="col">Entity</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-line ">
                  <td className="py-1.5">{formatDateTime(row.created_at, language)}</td>
                  <td className="py-1.5">{row.actor_label ?? "-"}</td>
                  <td className="py-1.5 font-mono text-xs">{row.action}</td>
                  <td className="muted py-1.5 text-xs">
                    {row.entity_type ?? "-"} {row.entity_id ? row.entity_id.slice(0, 8) : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : !isLoading ? (
        <p className="muted text-sm">{t("common.empty")}</p>
      ) : null}
    </div>
  );
}

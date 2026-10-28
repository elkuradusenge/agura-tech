/** Users: search, suspend, reactivate, reset password. */

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Search, UserCheck, UserX } from "lucide-react";
import { adminSupportApi } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import { formatDate } from "../../lib/utils";
import { Badge, Button, Card, Field, Input, Skeleton } from "../../components/ui";
import { useToast } from "../../components/Toast";

interface AdminUserRow {
  id: string;
  phone: string;
  full_name: string | null;
  status: string;
  language: string;
  province: string | null;
  created_at: string;
}

export function AdminUsersScreen() {
  const { t, language } = useI18n();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [temporary, setTemporary] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", search],
    queryFn: () => adminSupportApi.users({ q: search || undefined }),
  });

  async function act(id: string, action: "suspend" | "reactivate") {
    if (action === "suspend") await adminSupportApi.suspendUser(id);
    else await adminSupportApi.reactivateUser(id);
    void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("admin.users.title")}</h1>

      <Field label={t("common.search")} htmlFor="userSearch">
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-ink-muted" />
          <Input id="userSearch" className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
      </Field>

      {temporary ? (
        <Card className="space-y-1">
          <p className="text-sm font-medium">{t("admin.users.resetPassword")}</p>
          <p className="font-mono text-lg">{temporary}</p>
          <p className="muted text-xs">Share once, then ask the farmer to change it.</p>
        </Card>
      ) : null}

      {isLoading ? <Skeleton className="h-40" /> : null}

      {data?.items.length ? (
        <ul className="space-y-2">
          {(data.items as unknown as AdminUserRow[]).map((user) => (
            <li key={user.id} className="card flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{user.full_name ?? user.phone}</p>
                <p className="muted text-xs">
                  {user.phone} - {user.province ?? "-"} - {formatDate(user.created_at, language)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Badge tone={user.status === "active" ? "success" : "warning"}>{user.status}</Badge>
                <Button
                  variant="secondary"
                  icon={<KeyRound aria-hidden className="h-4 w-4" />}
                  onClick={async () => {
                    const result = await adminSupportApi.resetUserPassword(user.id);
                    setTemporary(result.temporary_password);
                  }}
                >
                  {t("admin.users.resetPassword")}
                </Button>
                {user.status === "active" ? (
                  <Button variant="danger" icon={<UserX aria-hidden className="h-4 w-4" />} onClick={() => void act(user.id, "suspend")}>
                    {t("admin.users.suspend")}
                  </Button>
                ) : (
                  <Button variant="secondary" icon={<UserCheck aria-hidden className="h-4 w-4" />} onClick={() => void act(user.id, "reactivate")}>
                    {t("admin.users.reactivate")}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : !isLoading ? (
        <p className="muted text-sm">{t("common.empty")}</p>
      ) : null}

      <Button
        variant="ghost"
        onClick={async () => {
          toast.push(t("common.saved"), "success");
          void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
        }}
      >
        {t("common.refresh")}
      </Button>
    </div>
  );
}

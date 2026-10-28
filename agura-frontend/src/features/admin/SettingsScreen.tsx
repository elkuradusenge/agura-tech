/** Application settings: the operational knobs, edited as JSON where free form. */

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { adminSupportApi } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import { Button, Card, Skeleton } from "../../components/ui";
import { useToast } from "../../components/Toast";

interface SettingRow {
  key: string;
  value: unknown;
  description: string | null;
}

export function AdminSettingsScreen() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const settings = useQuery({ queryKey: ["admin-settings"], queryFn: () => adminSupportApi.settings() });

  async function save(key: string, raw: string) {
    setBusy(key);
    try {
      let value: unknown = raw;
      try {
        value = JSON.parse(raw);
      } catch {
        // A plain string is a legitimate setting value.
      }
      await adminSupportApi.updateSetting(key, value);
      toast.push(`${key}: ${t("common.saved")}`, "success");
      void queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
    } catch (caught) {
      toast.push(caught instanceof Error ? caught.message : t("common.error"), "warning");
    } finally {
      setBusy(null);
    }
  }

  if (settings.isLoading) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("settings.title")}</h1>
      <p className="muted text-sm">
        Values are stored as JSON. The suppression threshold and reminder limits take effect immediately.
      </p>

      <ul className="space-y-2">
        {((settings.data?.items ?? []) as SettingRow[]).map((setting) => {
          const raw = drafts[setting.key] ?? JSON.stringify(setting.value);
          return (
            <li key={setting.key}>
              <Card className="space-y-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-mono text-sm font-semibold">{setting.key}</h2>
                  {setting.description ? <p className="muted text-xs">{setting.description}</p> : null}
                </div>
                <textarea
                  aria-label={setting.key}
                  className="min-h-16 w-full rounded-xl border border-line-strong bg-surface p-2 font-mono text-xs "
                  value={raw}
                  onChange={(event) => setDrafts((current) => ({ ...current, [setting.key]: event.target.value }))}
                />
                <Button
                  variant="secondary"
                  loading={busy === setting.key}
                  icon={<Save aria-hidden className="h-4 w-4" />}
                  onClick={() => void save(setting.key, raw)}
                >
                  {t("common.save")}
                </Button>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

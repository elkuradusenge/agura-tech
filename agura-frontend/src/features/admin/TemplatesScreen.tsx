/** Message templates across the three languages, with character counts for SMS. */

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { adminAiApi, adminSupportApi } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import { Badge, Button, Card, Skeleton, Textarea } from "../../components/ui";
import { useToast } from "../../components/Toast";
import type { Language } from "../../lib/api/types";

const LANGUAGES: Language[] = ["rw", "en", "fr"];
const SMS_LIMIT = 160;

interface TemplateRow {
  key: string;
  language: string;
  body: string;
  variables: string[] | null;
}

export function TemplatesScreen() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const templates = useQuery({ queryKey: ["admin-templates"], queryFn: () => adminSupportApi.templates() });

  useEffect(() => {
    if (!templates.data) return;
    const next: Record<string, string> = {};
    for (const row of templates.data.items as unknown as TemplateRow[]) {
      next[`${row.key}|${row.language}`] = row.body;
    }
    setDrafts(next);
  }, [templates.data]);

  const rows = (templates.data?.items ?? []) as unknown as TemplateRow[];
  const keys = Array.from(new Set(rows.map((row) => row.key)));

  async function save(key: string, language: Language) {
    setBusy(true);
    try {
      await adminSupportApi.saveTemplate(key, language, { body: drafts[`${key}|${language}`] ?? "" });
      toast.push(t("common.saved"), "success");
      void queryClient.invalidateQueries({ queryKey: ["admin-templates"] });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t("admin.templates.title")}</h1>
        <Button
          variant="secondary"
          loading={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const result = await adminAiApi.seedTemplates();
              toast.push(`${result.written}`, "success");
              void queryClient.invalidateQueries({ queryKey: ["admin-templates"] });
            } finally {
              setBusy(false);
            }
          }}
        >
          {t("common.refresh")}
        </Button>
      </div>

      {templates.isLoading ? <Skeleton className="h-40" /> : null}

      {keys.map((key) => (
        <Card key={key} className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-mono text-sm font-semibold">{key}</h2>
            {templates.data?.available_variables.length ? (
              <span className="muted text-xs">{templates.data.available_variables.join(", ")}</span>
            ) : null}
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            {LANGUAGES.map((language) => {
              const value = drafts[`${key}|${language}`] ?? "";
              return (
                <div key={language} className="space-y-1">
                  <label className="text-xs font-medium uppercase" htmlFor={`${key}-${language}`}>
                    {language}
                  </label>
                  <Textarea
                    id={`${key}-${language}`}
                    rows={4}
                    value={value}
                    onChange={(event) => setDrafts((current) => ({ ...current, [`${key}|${language}`]: event.target.value }))}
                  />
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone={value.length > SMS_LIMIT ? "warning" : "neutral"}>
                      {value.length}/{SMS_LIMIT}
                    </Badge>
                    <Button variant="ghost" loading={busy} icon={<Save aria-hidden className="h-4 w-4" />} onClick={() => void save(key, language)}>
                      {t("common.save")}
                    </Button>
                  </div>
                  {value.includes("TODO") ? <p className="text-xs text-warning">Needs translation review</p> : null}
                </div>
              );
            })}
          </div>

          <p className="muted text-xs">{t("admin.templates.characters")}</p>
        </Card>
      ))}
    </div>
  );
}

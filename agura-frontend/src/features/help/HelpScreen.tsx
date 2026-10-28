/** Help: ask a specialist and browse the partner directory. */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { HandHeart, Phone, Users } from "lucide-react";
import { fundingApi, helpApi } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import { Button, Card, Field, Select, Skeleton, Textarea } from "../../components/ui";

const SPECIALIST_TYPES = ["agronomist", "experienced_farmer", "training_visit"] as const;

export function HelpScreen() {
  const { t } = useI18n();
  const [specialistType, setSpecialistType] = useState<string>("agronomist");
  const [description, setDescription] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const partners = useQuery({ queryKey: ["partners"], queryFn: () => fundingApi.partners() });

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await helpApi.create({ specialist_type: specialistType, description });
      setSent(true);
      setDescription("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("help.title")}</h1>

      <Card className="space-y-3">
        <h2 className="flex items-center gap-2 font-semibold">
          <HandHeart aria-hidden className="h-5 w-5 text-primary-text" />
          {t("help.askSpecialist")}
        </h2>
        {sent ? <p className="rounded-lg bg-primary-tint p-3 text-sm text-primary-text">{t("help.sent")}</p> : null}
        <Field label={t("help.topic")} htmlFor="specialistType" required>
          <Select id="specialistType" value={specialistType} onChange={(event) => setSpecialistType(event.target.value)}>
            {SPECIALIST_TYPES.map((value) => (
              <option key={value} value={value}>
                {t(`help.specialist.${value}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("help.message")} htmlFor="description" required>
          <Textarea
            id="description"
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>
        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
        <Button loading={busy} onClick={() => void submit()} disabled={!description.trim()}>
          {t("help.send")}
        </Button>
      </Card>

      <Card className="space-y-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <Users aria-hidden className="h-5 w-5 text-primary-text" />
          {t("help.partners")}
        </h2>
        {partners.isLoading ? (
          <Skeleton className="h-16" />
        ) : partners.data?.partners.length ? (
          <ul className="space-y-2">
            {partners.data.partners.map((partner) => (
              <li key={partner.code} className="rounded-xl bg-surface-raised p-3 text-sm ">
                <p className="font-medium">{partner.name}</p>
                <p className="muted">{partner.role}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted text-sm">{t("common.empty")}</p>
        )}
        <p className="muted flex items-center gap-1 text-xs">
          <Phone aria-hidden className="h-3.5 w-3.5" />
          {t("help.callPartner")}
        </p>
      </Card>
    </div>
  );
}

/** Farmer settings: language, reminders, quiet hours, password, delete. */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Save, Trash2 } from "lucide-react";
import { meApi } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import { useAuth } from "../auth/AuthProvider";
import { usePreferences } from "../../app/providers";
import { Button, Card, Field, Input, Select, Skeleton } from "../../components/ui";
import { useToast } from "../../components/Toast";
import type { Language } from "../../lib/api/types";

export function SettingsScreen() {
  const { t, language, setLanguage } = useI18n();
  const { user, refreshUser, signOut } = useAuth();
  const { lowData, setLowData } = usePreferences();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    full_name: "",
    province: "",
    district: "",
    quiet_hours_start: "21:00",
    quiet_hours_end: "05:00",
    reminder_morning_time: "07:00",
    reminder_evening_time: "17:00",
    message_opt_in: false,
    data_saver: false,
  });
  const [passwords, setPasswords] = useState({ current_password: "", new_password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!user) return;
    setForm({
      full_name: user.full_name ?? "",
      province: user.province ?? "",
      district: user.district ?? "",
      quiet_hours_start: user.quiet_hours_start.slice(0, 5),
      quiet_hours_end: user.quiet_hours_end.slice(0, 5),
      reminder_morning_time: user.reminder_morning_time.slice(0, 5),
      reminder_evening_time: user.reminder_evening_time.slice(0, 5),
      message_opt_in: user.message_opt_in,
      data_saver: user.data_saver,
    });
  }, [user]);

  if (!user) return <Skeleton className="h-64" />;

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await meApi.update({ ...form, language });
      await refreshUser();
      toast.push(t("common.saved"), "success");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function changePassword() {
    setBusy(true);
    setError(null);
    try {
      await meApi.changePassword(passwords);
      setPasswords({ current_password: "", new_password: "" });
      toast.push(t("settings.passwordChanged"), "success");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function removeAccount() {
    setBusy(true);
    try {
      await meApi.deleteAccount();
      await signOut();
      navigate("/");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 pb-6">
      <h1 className="text-2xl font-bold">{t("settings.title")}</h1>

      <Card className="space-y-3">
        <Field label={t("auth.fullName")} htmlFor="fullName">
          <Input id="fullName" value={form.full_name} onChange={(event) => update("full_name", event.target.value)} />
        </Field>
        <Field label={t("common.language")} htmlFor="language">
          <Select id="language" value={language} onChange={(event) => setLanguage(event.target.value as Language)}>
            <option value="rw">Kinyarwanda</option>
            <option value="en">English</option>
            <option value="fr">Francais</option>
          </Select>
        </Field>
        <Field label={t("settings.province")} htmlFor="province">
          <Input id="province" value={form.province} onChange={(event) => update("province", event.target.value)} />
        </Field>
        <Field label={t("settings.district")} htmlFor="district">
          <Input id="district" value={form.district} onChange={(event) => update("district", event.target.value)} />
        </Field>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">{t("settings.reminders")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("settings.morningTime")} htmlFor="morningTime">
            <Input
              id="morningTime"
              type="time"
              value={form.reminder_morning_time}
              onChange={(event) => update("reminder_morning_time", event.target.value)}
            />
          </Field>
          <Field label={t("settings.eveningTime")} htmlFor="eveningTime">
            <Input
              id="eveningTime"
              type="time"
              value={form.reminder_evening_time}
              onChange={(event) => update("reminder_evening_time", event.target.value)}
            />
          </Field>
          <Field label={t("settings.quietStart")} htmlFor="quietStart">
            <Input
              id="quietStart"
              type="time"
              value={form.quiet_hours_start}
              onChange={(event) => update("quiet_hours_start", event.target.value)}
            />
          </Field>
          <Field label={t("settings.quietEnd")} htmlFor="quietEnd">
            <Input
              id="quietEnd"
              type="time"
              value={form.quiet_hours_end}
              onChange={(event) => update("quiet_hours_end", event.target.value)}
            />
          </Field>
        </div>
        <p className="muted text-xs">{t("settings.remindersHint")}</p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-5 w-5 accent-primary"
            checked={form.message_opt_in}
            onChange={(event) => update("message_opt_in", event.target.checked)}
          />
          {t("settings.messageOptIn")}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-5 w-5 accent-primary"
            checked={lowData}
            onChange={(event) => {
              setLowData(event.target.checked);
              update("data_saver", event.target.checked);
            }}
          />
          {t("common.lowData")}
        </label>
      </Card>

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <Button loading={busy} icon={<Save aria-hidden className="h-4 w-4" />} onClick={() => void save()}>
        {t("common.save")}
      </Button>

      <Card className="space-y-3">
        <h2 className="font-semibold">{t("settings.changePassword")}</h2>
        <Field label={t("auth.password")} htmlFor="currentPassword" required>
          <Input
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            value={passwords.current_password}
            onChange={(event) => setPasswords((current) => ({ ...current, current_password: event.target.value }))}
          />
        </Field>
        <Field label={t("auth.newPassword")} htmlFor="newPassword" required>
          <Input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            value={passwords.new_password}
            onChange={(event) => setPasswords((current) => ({ ...current, new_password: event.target.value }))}
          />
        </Field>
        <Button
          variant="secondary"
          loading={busy}
          disabled={!passwords.current_password || passwords.new_password.length < 8}
          onClick={() => void changePassword()}
        >
          {t("common.save")}
        </Button>
      </Card>

      <Card className="space-y-2 border-danger">
        <h2 className="flex items-center gap-2 font-semibold text-danger">
          <AlertTriangle aria-hidden className="h-4 w-4" />
          {t("settings.deleteAccount")}
        </h2>
        <p className="muted text-xs">{t("settings.deleteConfirm")}</p>
        {confirmDelete ? (
          <div className="flex gap-2">
            <Button
              variant="danger"
              loading={busy}
              icon={<Trash2 aria-hidden className="h-4 w-4" />}
              onClick={() => void removeAccount()}
            >
              {t("common.confirm")}
            </Button>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              {t("common.cancel")}
            </Button>
          </div>
        ) : (
          <Button variant="secondary" onClick={() => setConfirmDelete(true)}>
            {t("settings.deleteAccount")}
          </Button>
        )}
      </Card>
    </div>
  );
}

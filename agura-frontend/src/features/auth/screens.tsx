/** Sign up, sign in, password reset and the administrator sign in. */

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { KeyRound, Leaf, Loader2, Phone, ShieldCheck, Sprout } from "lucide-react";
import { authApi } from "../../lib/api";
import { ApiError } from "../../lib/api/client";
import { useI18n } from "../../lib/i18n";
import { Button, Card, Field, Input } from "../../components/ui";
import { useAuth } from "./AuthProvider";

function useErrorText() {
  const { t } = useI18n();
  return (error: unknown): string | null => {
    if (error instanceof ApiError) {
      const translated = t(error.translationKey);
      return translated === error.translationKey ? error.message : translated;
    }
    if (error instanceof Error) return error.message;
    return null;
  };
}

export function SignUpScreen() {
  const { t } = useI18n();
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const errorText = useErrorText();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signUp(phone, password, fullName || undefined);
      navigate("/app/products");
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title={t("auth.signUp")} icon={<Sprout aria-hidden className="h-8 w-8 text-primary-text" />}>
      <form className="space-y-4" onSubmit={submit}>
        <Field label={t("auth.phone")} htmlFor="phone" required hint="0788123456">
          <Input
            id="phone"
            name="phone"
            inputMode="tel"
            autoComplete="tel"
            required
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </Field>
        <Field label={t("auth.fullName")} htmlFor="fullName">
          <Input
            id="fullName"
            name="fullName"
            autoComplete="name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
          />
        </Field>
        <Field label={t("auth.password")} htmlFor="password" required hint="8+">
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" fullWidth loading={busy}>
          {t("auth.signUp")}
        </Button>
      </form>
      <div className="mt-4 flex justify-between text-sm">
        <Link className="underline-offset-4 hover:underline" to="/sign-in">
          {t("auth.signIn")}
        </Link>
        <Link className="underline-offset-4 hover:underline" to="/reset-password">
          {t("auth.resetPassword")}
        </Link>
      </div>
    </AuthShell>
  );
}

export function SignInScreen() {
  const { t } = useI18n();
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const errorText = useErrorText();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(phone, password);
      navigate("/app/products");
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title={t("auth.signIn")} icon={<Leaf aria-hidden className="h-8 w-8 text-primary-text" />}>
      <form className="space-y-4" onSubmit={submit}>
        <Field label={t("auth.phone")} htmlFor="phone" required>
          <Input
            id="phone"
            name="phone"
            inputMode="tel"
            autoComplete="username"
            required
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </Field>
        <Field label={t("auth.password")} htmlFor="password" required>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" fullWidth loading={busy} icon={<Phone aria-hidden className="h-4 w-4" />}>
          {t("auth.signIn")}
        </Button>
      </form>
      <div className="mt-4 flex justify-between text-sm">
        <Link className="underline-offset-4 hover:underline" to="/sign-up">
          {t("auth.signUp")}
        </Link>
        <Link className="underline-offset-4 hover:underline" to="/reset-password">
          {t("auth.resetPassword")}
        </Link>
      </div>
    </AuthShell>
  );
}

export function ResetPasswordScreen() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const errorText = useErrorText();
  const [stage, setStage] = useState<"request" | "confirm">("request");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function requestCode(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await authApi.requestReset(phone);
      setStage("confirm");
      // Outside production the backend returns the code so the flow can be tested.
      setNotice(response.debug_code ? `code: ${response.debug_code}` : response.message);
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  async function confirm(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await authApi.confirmReset({ phone, code, new_password: password });
      navigate("/sign-in");
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title={t("auth.resetPassword")} icon={<KeyRound aria-hidden className="h-8 w-8 text-primary-text" />}>
      {stage === "request" ? (
        <form className="space-y-4" onSubmit={requestCode}>
          <Field label={t("auth.phone")} htmlFor="phone" required>
            <Input
              id="phone"
              inputMode="tel"
              required
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </Field>
          {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
          <Button type="submit" fullWidth loading={busy}>
            {t("auth.sendCode")}
          </Button>
        </form>
      ) : (
        <form className="space-y-4" onSubmit={confirm}>
          {notice ? <p className="muted text-sm">{notice}</p> : null}
          <Field label={t("auth.code")} htmlFor="code" required>
            <Input
              id="code"
              inputMode="numeric"
              required
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
          </Field>
          <Field label={t("auth.newPassword")} htmlFor="newPassword" required>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>
          {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
          <Button type="submit" fullWidth loading={busy}>
            {t("auth.resetPassword")}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}

export function AdminSignInScreen() {
  const { t } = useI18n();
  const { adminSignIn } = useAuth();
  const navigate = useNavigate();
  const errorText = useErrorText();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await adminSignIn(identifier, password);
      navigate("/admin");
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title={t("auth.adminSignIn")}
      icon={<ShieldCheck aria-hidden className="h-8 w-8 text-primary-text" />}
    >
      <form className="space-y-4" onSubmit={submit}>
        <Field label={t("auth.phone")} htmlFor="identifier" required hint="email or phone">
          <Input
            id="identifier"
            required
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
          />
        </Field>
        <Field label={t("auth.password")} htmlFor="password" required>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
        <Button type="submit" fullWidth loading={busy}>
          {t("auth.signIn")}
        </Button>
      </form>
    </AuthShell>
  );
}

function AuthShell({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-5 px-5 py-10">
      <div className="space-y-2 text-center">
        {icon}
        <h1 className="text-2xl font-bold">{title}</h1>
      </div>
      <Card>{children}</Card>
      <Link className="text-center text-sm underline-offset-4 hover:underline" to="/">
        {t("app.name")}
      </Link>
    </div>
  );
}

/** Used by the guard to avoid a flash of the wrong screen while auth loads. */
export function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 aria-hidden className="h-6 w-6 animate-spin text-primary-text" />
      <span className="sr-only">loading</span>
    </div>
  );
}

/** Keeps the language switch usable on the auth screens too. */
export function useAuthRedirect(ready: boolean, target: string) {
  const navigate = useNavigate();
  useEffect(() => {
    if (ready) navigate(target, { replace: true });
  }, [ready, navigate, target]);
}

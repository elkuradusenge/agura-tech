/** Layout shells: farmer navigation, admin sidebar, language, theme, low data. */

import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Bell,
  BookOpen,
  ClipboardList,
  FileSpreadsheet,
  Home,
  Languages,
  LayoutDashboard,
  Leaf,
  LineChart,
  LogOut,
  MessageSquare,
  Moon,
  Settings,
  Sparkles,
  Sprout,
  Sun,
  Users,
  Wallet,
  WifiOff,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { notificationsApi } from "../lib/api";
import { useI18n } from "../lib/i18n";
import { SUPPORTED_LANGUAGES, LANGUAGE_LABELS, type Language } from "../lib/i18n/types";
import { cn } from "../lib/utils";
import { usePreferences } from "../app/providers";
import { useSocket } from "../app/providers";
import { useAuth } from "../features/auth/AuthProvider";
import { Badge, Button } from "./ui";

interface NavItem {
  to: string;
  labelKey: string;
  icon: ReactNode;
  badge?: number;
}

/** The wordmark, used by both shells and by the landing page header. */
export function Brand({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  return (
    <span className="flex items-center gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-card bg-primary text-primary-on">
        <Leaf aria-hidden className="h-5 w-5" />
      </span>
      {compact ? null : (
        /* Hidden below sm so the header still fits a 360px phone. */
        <span className="hidden text-lg font-bold tracking-tight text-ink-heading sm:inline">
          {t("app.name")}
        </span>
      )}
    </span>
  );
}

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n();
  const label = t("common.language");

  return (
    <span className="flex items-center gap-1 rounded-pill border border-line px-2 py-1">
      <Languages aria-hidden className="h-4 w-4 text-ink-muted" />
      <select
        aria-label={label}
        className="min-w-0 cursor-pointer rounded-pill bg-transparent py-1 pr-1 text-sm text-ink-heading focus-visible:outline-none"
        value={language}
        onChange={(event) => setLanguage(event.target.value as Language)}
      >
        {SUPPORTED_LANGUAGES.map((code) => (
          <option key={code} value={code}>
            {LANGUAGE_LABELS[code]}
          </option>
        ))}
      </select>
    </span>
  );
}

export function ThemeToggle() {
  const { setTheme, theme } = usePreferences();
  const { t } = useI18n();
  return (
    <button
      type="button"
      aria-label={t("common.theme")}
      className="tap-target press flex items-center justify-center rounded-pill p-2.5 text-ink-muted hover:bg-primary-tint hover:text-primary-text"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      {theme === "dark" ? <Sun aria-hidden className="h-5 w-5" /> : <Moon aria-hidden className="h-5 w-5" />}
    </button>
  );
}

function LowDataToggle() {
  const { lowData, setLowData } = usePreferences();
  const { t } = useI18n();
  return (
    <button
      type="button"
      aria-pressed={lowData}
      aria-label={t("common.lowData")}
      className={cn(
        "tap-target press rounded-pill px-3 py-2 text-xs font-medium",
        lowData
          ? "bg-primary text-primary-on"
          : "text-ink-muted hover:bg-primary-tint hover:text-primary-text",
      )}
      onClick={() => setLowData(!lowData)}
    >
      1x
    </button>
  );
}

/** Language, theme and low data, grouped so both shells and the landing page agree. */
export function PreferenceControls({ showLowData = true }: { showLowData?: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <LanguageSwitcher />
      <ThemeToggle />
      {showLowData ? <LowDataToggle /> : null}
    </div>
  );
}

export function OfflineBanner() {
  const { online } = usePreferences();
  const { t } = useI18n();
  const { status } = useSocket();
  if (online && status !== "reconnecting") return null;
  return (
    <div
      className="flex items-center justify-center gap-2 bg-warning px-4 py-2 text-sm font-medium text-canvas"
      role="status"
    >
      <WifiOff aria-hidden className="h-4 w-4" />
      {t("common.offline")}
    </div>
  );
}

function useUnreadCount(enabled: boolean) {
  const { data } = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: notificationsApi.unreadCount,
    enabled,
    refetchInterval: 60_000,
  });
  return data?.unread ?? 0;
}

const ACTIVE_NAV = "bg-primary-tint font-semibold text-primary-text";
const IDLE_NAV = "text-ink hover:bg-surface-raised";

export function FarmerLayout({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const unread = useUnreadCount(Boolean(user));

  const items: NavItem[] = [
    { to: "/app/products", labelKey: "nav.products", icon: <Leaf aria-hidden className="h-5 w-5" /> },
    { to: "/app/plantings", labelKey: "nav.plantings", icon: <Sprout aria-hidden className="h-5 w-5" /> },
    { to: "/app/today", labelKey: "nav.today", icon: <ClipboardList aria-hidden className="h-5 w-5" /> },
    {
      to: "/app/notifications",
      labelKey: "nav.notifications",
      icon: <Bell aria-hidden className="h-5 w-5" />,
      badge: unread,
    },
    { to: "/app/help", labelKey: "nav.help", icon: <MessageSquare aria-hidden className="h-5 w-5" /> },
    { to: "/app/settings", labelKey: "nav.settings", icon: <Settings aria-hidden className="h-5 w-5" /> },
  ];

  return (
    <div className="min-h-screen pb-20 lg:pb-0">
      <OfflineBanner />
      <header className="sticky top-0 z-30 border-b border-line bg-surface-translucent backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <NavLink to="/app" className="tap-target flex items-center">
            <Brand />
          </NavLink>
          <div className="flex items-center gap-1">
            <PreferenceControls />
            <Button
              variant="ghost"
              aria-label={t("auth.signOut")}
              onClick={async () => {
                await signOut();
                navigate("/");
              }}
            >
              <LogOut aria-hidden className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <nav
        aria-label={t("nav.products")}
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface lg:hidden"
      >
        <ul className="flex">
          {items.slice(0, 4).map((item) => (
            <li key={item.to} className="relative flex-1">
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "tap-target flex flex-col items-center gap-1 py-2 text-[11px] transition-colors duration-fast",
                    isActive ? "text-primary-text" : "text-ink-muted",
                  )
                }
              >
                {item.icon}
                <span>{t(item.labelKey)}</span>
                {item.badge && item.badge > 0 ? (
                  <span className="absolute right-4 top-1 rounded-pill bg-primary px-1.5 text-[10px] font-semibold text-primary-on">
                    {item.badge}
                  </span>
                ) : null}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mx-auto flex max-w-6xl gap-8 px-4 py-8">
        <aside className="hidden w-56 shrink-0 lg:block">
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "tap-target press flex items-center justify-between gap-2 rounded-pill px-4 py-2 text-sm transition-colors duration-fast",
                      isActive ? ACTIVE_NAV : IDLE_NAV,
                    )
                  }
                >
                  <span className="flex items-center gap-2">
                    {item.icon}
                    {t(item.labelKey)}
                  </span>
                  {item.badge && item.badge > 0 ? <Badge tone="info">{item.badge}</Badge> : null}
                </NavLink>
              </li>
            ))}
          </ul>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

export function AdminLayout({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { signOut, admin } = useAuth();
  const navigate = useNavigate();
  const can = (permission: string) => admin?.permissions.includes(permission) ?? false;

  const items: NavItem[] = [
    { to: "/admin", labelKey: "nav.dashboard", icon: <LayoutDashboard aria-hidden className="h-5 w-5" /> },
    {
      to: "/admin/surveys",
      labelKey: "nav.surveyData",
      icon: <FileSpreadsheet aria-hidden className="h-5 w-5" />,
    },
    { to: "/admin/plants", labelKey: "nav.plants", icon: <Leaf aria-hidden className="h-5 w-5" /> },
    { to: "/admin/suggestions", labelKey: "nav.suggestions", icon: <Sparkles aria-hidden className="h-5 w-5" /> },
    { to: "/admin/products", labelKey: "nav.adminProducts", icon: <BookOpen aria-hidden className="h-5 w-5" /> },
    { to: "/admin/users", labelKey: "nav.users", icon: <Users aria-hidden className="h-5 w-5" /> },
    { to: "/admin/monitoring", labelKey: "nav.monitoring", icon: <LineChart aria-hidden className="h-5 w-5" /> },
    {
      to: "/admin/requests",
      labelKey: "nav.specialistRequests",
      icon: <MessageSquare aria-hidden className="h-5 w-5" />,
    },
    { to: "/admin/funding", labelKey: "nav.fundingInterest", icon: <Wallet aria-hidden className="h-5 w-5" /> },
    { to: "/admin/templates", labelKey: "nav.templates", icon: <Bell aria-hidden className="h-5 w-5" /> },
    { to: "/admin/audit", labelKey: "nav.auditLog", icon: <Home aria-hidden className="h-5 w-5" /> },
    { to: "/admin/settings", labelKey: "nav.settings2", icon: <Settings aria-hidden className="h-5 w-5" /> },
  ];

  const visible = items.filter((item) => {
    if (item.to === "/admin/users") return can("users.read");
    if (item.to === "/admin/audit") return can("audit.read");
    if (item.to === "/admin/monitoring") return can("monitoring.read");
    if (item.to === "/admin/requests" || item.to === "/admin/funding") return can("support.read");
    if (item.to === "/admin/templates") return can("templates.write") || can("support.read");
    if (item.to === "/admin/settings") return can("settings.write") || can("users.read");
    if (item.to === "/admin/surveys" || item.to === "/admin/plants") return can("surveys.read") || can("analysis.read");
    if (item.to === "/admin/suggestions") return can("analysis.read");
    if (item.to === "/admin/products") return can("products.read");
    return true;
  });

  return (
    <div className="min-h-screen">
      <OfflineBanner />
      <header className="sticky top-0 z-30 border-b border-line bg-surface-translucent backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <Brand />
            {admin ? <Badge tone="info">{admin.role}</Badge> : null}
          </div>
          <div className="flex items-center gap-1">
            <PreferenceControls />
            <Button
              variant="ghost"
              aria-label={t("auth.signOut")}
              onClick={async () => {
                await signOut();
                navigate("/admin/sign-in");
              }}
            >
              <LogOut aria-hidden className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-8 px-4 py-8">
        <aside className="hidden w-60 shrink-0 md:block">
          <nav aria-label={t("nav.dashboard")}>
            <ul className="space-y-1">
              {visible.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === "/admin"}
                    className={({ isActive }) =>
                      cn(
                        "tap-target press flex items-center gap-2 rounded-pill px-4 py-2 text-sm transition-colors duration-fast",
                        isActive ? ACTIVE_NAV : IDLE_NAV,
                      )
                    }
                  >
                    {item.icon}
                    {t(item.labelKey)}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

/**
 * Living style guide. Documents the tokens, the type scale and the component
 * patterns so a new screen has something concrete to copy.
 */

import { AlertTriangle, CheckCircle2, Info, Leaf, Sprout } from "lucide-react";
import { useI18n } from "../../lib/i18n";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Input,
  ProgressBar,
  Select,
  Skeleton,
  Textarea,
} from "../../components/ui";
import { CompositionPieChart, ShareBarChart, TrendLineChart } from "../../components/charts";

/* Token names only. The values live in src/styles/tokens.css. */
const SWATCHES = [
  { name: "--primary", className: "bg-primary", note: "Filled buttons, links, focus" },
  { name: "--primary-tint", className: "bg-primary-tint", note: "Selected and hover surface" },
  { name: "--brand-secondary", className: "bg-ink-heading", note: "Headings, dark raised surface" },
  { name: "--surface-raised", className: "bg-surface-raised", note: "Secondary fill" },
  { name: "--warning", className: "bg-warning", note: "Attention, always with text" },
  { name: "--danger", className: "bg-danger", note: "Destructive and errors" },
];

const SAMPLE = [
  { label: "Kigali", value: 0.42 },
  { label: "Northern", value: 0.18 },
  { label: "Southern", value: 0.26 },
  { label: "Eastern", value: 0.11 },
];

export function StyleGuide() {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-content space-y-12 px-4 py-12 sm:px-6">
      <header className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">AGUra style guide</h1>
        <p className="muted max-w-2xl text-sm leading-relaxed">
          Google Sans, one Lucide icon set, status that carries text, 12px cards and inputs, pill
          buttons, and an 8px spacing grid. Colour values live in one file,{" "}
          <code className="rounded bg-surface-raised px-1.5 py-0.5 text-xs">src/styles/tokens.css</code>
          , and are used through the semantic tokens below.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-2xl font-medium">Colour tokens</h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SWATCHES.map((swatch) => (
            <li key={swatch.name}>
              <Card className="space-y-2">
                <div className={`h-14 rounded-card border border-line ${swatch.className}`} />
                <p className="font-mono text-xs text-ink-heading">{swatch.name}</p>
                <p className="muted text-xs">{swatch.note}</p>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-medium">Type scale</h2>
        <Card className="space-y-4">
          <div className="space-y-1">
            <p className="muted font-mono text-xs">display / 48 / 700</p>
            <p className="text-5xl font-bold tracking-tight">AGUra</p>
          </div>
          <div className="space-y-1">
            <p className="muted font-mono text-xs">headline / 36 / 700</p>
            <p className="text-4xl font-bold tracking-tight">Grow more</p>
          </div>
          <div className="space-y-1">
            <p className="muted font-mono text-xs">title / 24 / 500</p>
            <p className="text-2xl font-medium">Today</p>
          </div>
          <div className="space-y-1">
            <p className="muted font-mono text-xs">body / 16 / 400</p>
            <p className="text-base leading-relaxed">
              Body copy stays at 16px on a phone so Kinyarwanda remains readable.
            </p>
          </div>
          <div className="space-y-1">
            <p className="muted font-mono text-xs">label / 14 / 500</p>
            <p className="text-sm font-medium text-ink-heading">Label</p>
          </div>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-medium">Controls</h2>
        <Card className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="warning">Warning</Button>
          <Button variant="danger">Danger</Button>
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
        </Card>
        <Card className="grid gap-4 sm:grid-cols-2">
          <Field label="Label" htmlFor="sgInput" hint="Helper text">
            <Input id="sgInput" placeholder="Placeholder" />
          </Field>
          <Field label="Required" htmlFor="sgSelect" required error="This field is required">
            <Select id="sgSelect">
              <option>Option</option>
            </Select>
          </Field>
          <Field label="Multiline" htmlFor="sgTextarea">
            <Textarea id="sgTextarea" rows={3} />
          </Field>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-medium">Status</h2>
        <p className="muted text-sm">
          Never colour alone. Every badge carries a label, so it survives colour blindness and a
          screen reader.
        </p>
        <Card className="flex flex-wrap gap-2">
          <Badge tone="success" icon={<CheckCircle2 aria-hidden className="h-3.5 w-3.5" />}>
            {t("status.trackable")}
          </Badge>
          <Badge tone="warning" icon={<AlertTriangle aria-hidden className="h-3.5 w-3.5" />}>
            {t("status.suppressed")}
          </Badge>
          <Badge tone="info" icon={<Info aria-hidden className="h-3.5 w-3.5" />}>
            {t("status.draft")}
          </Badge>
          <Badge tone="neutral">{t("status.paused")}</Badge>
          <Badge tone="danger">{t("status.retired")}</Badge>
        </Card>
        <Card>
          <ProgressBar value={64} label={t("plantings.progress")} />
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-medium">States</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-24" />
          <EmptyState title={t("common.empty")} icon={<Leaf aria-hidden className="h-8 w-8 text-primary-text" />} />
          <ErrorState title={t("common.error")} retryLabel={t("common.retry")} onRetry={() => undefined} />
          <Card>
            <p className="flex items-center gap-2 text-sm">
              <Sprout aria-hidden className="h-4 w-4 text-primary-text" />
              Offline and low data keep the last good data on screen.
            </p>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-medium">Charts</h2>
        <Card>
          <ShareBarChart data={SAMPLE} />
        </Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <TrendLineChart data={SAMPLE} />
          </Card>
          <Card>
            <CompositionPieChart data={SAMPLE} />
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-medium">Motion</h2>
        <Card>
          <p className="text-sm leading-relaxed">
            150ms for hover, focus and press. 200 to 250ms for accordion, tab and page changes.
            Material easing, cubic-bezier(0.2, 0, 0, 1). Pressed buttons scale to 0.97. Everything
            collapses to no motion under{" "}
            <code className="rounded bg-surface-raised px-1.5 py-0.5 text-xs">prefers-reduced-motion</code>.
          </p>
        </Card>
      </section>
    </div>
  );
}

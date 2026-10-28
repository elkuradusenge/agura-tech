/**
 * Public landing page at "/". No session required.
 *
 * Every claim here has to be one we can stand behind. There are no invented
 * numbers: the only figure is the oyster mushroom harvest window, which comes
 * from the seeded product and is labelled indicative, to be validated with RAB.
 */

import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  BookOpen,
  Building2,
  ChevronDown,
  CircleHelp,
  Droplets,
  GraduationCap,
  HandHeart,
  HeartPulse,
  House,
  Landmark,
  Leaf,
  type LucideIcon,
  MessageSquare,
  Phone,
  Sprout,
  ShieldCheck,
  Sun,
  TrendingUp,
  Users,
} from "lucide-react";
import { Brand, LanguageSwitcher, ThemeToggle } from "../../components/layout";
import { Button } from "../../components/ui";
import { useI18n } from "../../lib/i18n";

interface Feature {
  icon: LucideIcon;
  titleKey: string;
  bodyKey: string;
}

const STEPS: Feature[] = [
  { icon: BookOpen, titleKey: "landing.step.learn.title", bodyKey: "landing.step.learn.body" },
  { icon: Sprout, titleKey: "landing.step.plant.title", bodyKey: "landing.step.plant.body" },
  { icon: Bell, titleKey: "landing.step.follow.title", bodyKey: "landing.step.follow.body" },
  { icon: TrendingUp, titleKey: "landing.step.harvest.title", bodyKey: "landing.step.harvest.body" },
];

const OFFERS: Feature[] = [
  { icon: GraduationCap, titleKey: "landing.get.training.title", bodyKey: "landing.get.training.body" },
  { icon: Droplets, titleKey: "landing.get.reminders.title", bodyKey: "landing.get.reminders.body" },
  { icon: HeartPulse, titleKey: "landing.get.benefits.title", bodyKey: "landing.get.benefits.body" },
  { icon: Leaf, titleKey: "landing.get.preserve.title", bodyKey: "landing.get.preserve.body" },
  { icon: HandHeart, titleKey: "landing.get.help.title", bodyKey: "landing.get.help.body" },
  { icon: TrendingUp, titleKey: "landing.get.scale.title", bodyKey: "landing.get.scale.body" },
];

const SIGNUP = [
  { icon: Phone, titleKey: "landing.signup.step1.title", bodyKey: "landing.signup.step1.body" },
  { icon: BadgeCheck, titleKey: "landing.signup.step2.title", bodyKey: "landing.signup.step2.body" },
  { icon: Sprout, titleKey: "landing.signup.step3.title", bodyKey: "landing.signup.step3.body" },
];

const FAQ = [1, 2, 3, 4];

function Section({
  id,
  children,
  tinted = false,
  labelledBy,
}: {
  id?: string;
  children: ReactNode;
  tinted?: boolean;
  labelledBy?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={tinted ? "section bg-surface-raised" : "section"}
    >
      <div className="section-inner">{children}</div>
    </section>
  );
}

function SectionHeading({ id, title, body }: { id: string; title: string; body?: string }) {
  return (
    <div className="mb-10 max-w-2xl">
      <h2 id={id} className="text-3xl font-bold tracking-tight sm:text-4xl">
        {title}
      </h2>
      {body ? <p className="muted mt-3 text-base leading-relaxed">{body}</p> : null}
    </div>
  );
}

function FeatureCard({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <div className="card card-interactive flex h-full flex-col gap-3">
      <span className="flex h-11 w-11 items-center justify-center rounded-card bg-primary-tint text-primary-text">
        <Icon aria-hidden className="h-5 w-5" />
      </span>
      <h3 className="text-base font-medium">{title}</h3>
      <p className="muted text-sm leading-relaxed">{body}</p>
    </div>
  );
}

/** The family farm illustration: shapes and Lucide icons, no image asset. */
function HeroArt({ caption }: { caption: string }) {
  return (
    <div
      role="img"
      aria-label={caption}
      className="panel relative aspect-[4/3] w-full overflow-hidden bg-surface-raised"
    >
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-primary-tint" />
      <div className="absolute right-6 top-6 text-warning">
        <Sun aria-hidden className="h-10 w-10" />
      </div>
      <div className="absolute inset-x-6 bottom-8 flex items-end justify-between">
        <Sprout aria-hidden className="h-16 w-16 text-primary" />
        <Sprout aria-hidden className="h-12 w-12 text-primary" />
        <Sprout aria-hidden className="h-20 w-20 text-primary" />
      </div>
      <div className="absolute left-6 top-8 flex flex-col gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-pill bg-surface text-primary-text shadow-e1">
          <Users aria-hidden className="h-5 w-5" />
        </span>
        <span className="flex h-10 w-10 items-center justify-center rounded-pill bg-surface text-primary-text shadow-e1">
          <Droplets aria-hidden className="h-5 w-5" />
        </span>
        <span className="flex h-10 w-10 items-center justify-center rounded-pill bg-surface text-primary-text shadow-e1">
          <House aria-hidden className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

export function LandingPage() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-40 border-b border-line bg-canvas-translucent backdrop-blur">
        <div className="mx-auto flex max-w-content items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Brand />
          <div className="flex items-center gap-1 sm:gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
            <Link to="/sign-in" className="hidden sm:block">
              <Button variant="ghost" size="sm">
                {t("landing.nav.signIn")}
              </Button>
            </Link>
            <Link to="/sign-up">
              <Button size="sm">{t("landing.nav.getStarted")}</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="section">
          <div className="section-inner grid items-center gap-10 lg:grid-cols-2">
            <div className="animate-fade-up">
              <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
                {t("landing.hero.title")}
              </h1>
              <p className="muted mt-5 max-w-xl text-lg leading-relaxed">{t("landing.hero.body")}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/sign-up">
                  <Button size="lg" fullWidth icon={<ArrowRight aria-hidden className="h-4 w-4" />}>
                    {t("landing.hero.primary")}
                  </Button>
                </Link>
                <a href="#how">
                  <Button variant="secondary" size="lg" fullWidth>
                    {t("landing.hero.secondary")}
                  </Button>
                </a>
              </div>
            </div>
            <HeroArt caption={t("landing.hero.artCaption")} />
          </div>
        </section>

        <Section tinted labelledBy="problem-title">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <h2 id="problem-title" className="text-3xl font-bold tracking-tight sm:text-4xl">
                {t("landing.problem.title")}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-ink">{t("landing.problem.body")}</p>
            </div>
            <ul className="space-y-3">
              {["landing.problem.point1", "landing.problem.point2"].map((key) => (
                <li key={key} className="flex items-start gap-3 rounded-panel bg-surface p-4 shadow-e1">
                  <CircleHelp aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-primary-text" />
                  <span className="text-sm leading-relaxed">{t(key)}</span>
                </li>
              ))}
            </ul>
          </div>
        </Section>

        <Section id="how" labelledBy="how-title">
          <SectionHeading id="how-title" title={t("landing.how.title")} body={t("landing.how.body")} />
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <li key={step.titleKey} className="relative">
                <span className="absolute -top-3 left-5 z-10 flex h-7 w-7 items-center justify-center rounded-pill bg-primary text-xs font-bold text-primary-on">
                  {index + 1}
                </span>
                <FeatureCard icon={step.icon} title={t(step.titleKey)} body={t(step.bodyKey)} />
              </li>
            ))}
          </ol>
        </Section>

        <Section tinted labelledBy="get-title">
          <SectionHeading id="get-title" title={t("landing.get.title")} body={t("landing.get.body")} />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {OFFERS.map((offer) => (
              <li key={offer.titleKey}>
                <FeatureCard icon={offer.icon} title={t(offer.titleKey)} body={t(offer.bodyKey)} />
              </li>
            ))}
          </ul>
        </Section>

        <Section labelledBy="product-title">
          <p className="mb-2 text-sm font-medium uppercase tracking-wide text-primary-text">
            {t("landing.product.eyebrow")}
          </p>
          <SectionHeading id="product-title" title={t("landing.product.title")} />
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="panel flex flex-col justify-center gap-3 p-8">
              <span className="flex h-14 w-14 items-center justify-center rounded-panel bg-primary-tint text-primary-text">
                <Sprout aria-hidden className="h-7 w-7" />
              </span>
              <h3 className="text-2xl font-bold">{t("landing.product.name")}</h3>
              <p className="muted leading-relaxed">{t("landing.product.body")}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="card">
                <h4 className="text-sm font-medium text-ink-muted">{t("landing.product.needsLabel")}</h4>
                <ul className="mt-3 space-y-2 text-sm">
                  {[1, 2, 3, 4].map((index) => (
                    <li key={index} className="flex items-start gap-2">
                      <BadgeCheck aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-primary-text" />
                      {t(`landing.product.need${index}`)}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col gap-4">
                <div className="card">
                  <h4 className="text-sm font-medium text-ink-muted">{t("landing.product.harvestLabel")}</h4>
                  <p className="mt-2 text-sm leading-relaxed">{t("landing.product.harvestValue")}</p>
                </div>
                <div className="card">
                  <h4 className="text-sm font-medium text-ink-muted">{t("landing.product.benefitsLabel")}</h4>
                  <p className="mt-2 text-sm leading-relaxed">{t("landing.product.benefitsValue")}</p>
                </div>
              </div>
            </div>
          </div>
        </Section>

        <Section tinted labelledBy="audience-title">
          <SectionHeading id="audience-title" title={t("landing.audience.title")} />
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { icon: House, title: "landing.audience.family.title", body: "landing.audience.family.body" },
              { icon: Building2, title: "landing.audience.business.title", body: "landing.audience.business.body" },
            ].map((card) => (
              <div key={card.title} className="panel flex gap-4 p-6">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-card bg-primary text-primary-on">
                  <card.icon aria-hidden className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="text-lg font-medium">{t(card.title)}</h3>
                  <p className="muted mt-1 text-sm leading-relaxed">{t(card.body)}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section labelledBy="partners-title">
          <SectionHeading
            id="partners-title"
            title={t("landing.partners.title")}
            body={t("landing.partners.body")}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: Landmark, name: "landing.partners.rab.name", role: "landing.partners.rab.role" },
              { icon: Landmark, name: "landing.partners.brd.name", role: "landing.partners.brd.role" },
            ].map((partner) => (
              <div key={partner.name} className="card flex items-center gap-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-card bg-surface-raised text-primary-text">
                  <partner.icon aria-hidden className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-medium">{t(partner.name)}</h3>
                  <p className="muted text-sm">{t(partner.role)}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm font-medium text-warning">{t("landing.partners.planned")}</p>
        </Section>

        <Section tinted labelledBy="signup-title">
          <SectionHeading
            id="signup-title"
            title={t("landing.signup.title")}
            body={t("landing.signup.body")}
          />
          <ol className="grid gap-4 sm:grid-cols-3">
            {SIGNUP.map((step, index) => (
              <li key={step.titleKey} className="card flex flex-col gap-3">
                <span className="flex items-center gap-2 text-sm font-medium text-primary-text">
                  <step.icon aria-hidden className="h-5 w-5" />
                  {index + 1}
                </span>
                <h3 className="text-base font-medium">{t(step.titleKey)}</h3>
                <p className="muted text-sm leading-relaxed">{t(step.bodyKey)}</p>
              </li>
            ))}
          </ol>
          <div className="mt-8">
            <Link to="/sign-up">
              <Button size="lg" icon={<ArrowRight aria-hidden className="h-4 w-4" />}>
                {t("landing.nav.getStarted")}
              </Button>
            </Link>
          </div>
        </Section>

        <Section labelledBy="faq-title">
          <SectionHeading id="faq-title" title={t("landing.faq.title")} />
          <div className="max-w-3xl space-y-2">
            {FAQ.map((index) => (
              <details key={index} className="group rounded-card border border-line bg-surface px-5 py-4">
                <summary className="press flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-ink-heading">
                  {t(`landing.faq.q${index}`)}
                  <ChevronDown
                    aria-hidden
                    className="h-4 w-4 shrink-0 text-ink-muted transition-transform duration-base ease-material group-open:rotate-180"
                  />
                </summary>
                <p className="muted mt-3 text-sm leading-relaxed">{t(`landing.faq.a${index}`)}</p>
              </details>
            ))}
          </div>
        </Section>
      </main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto grid max-w-content gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
          <div className="space-y-3">
            <Brand />
            <p className="muted max-w-xs text-sm leading-relaxed">{t("app.tagline")}</p>
          </div>
          <div className="space-y-2 text-sm">
            <h2 className="text-sm font-medium text-ink-heading">{t("landing.footer.contact")}</h2>
            <a className="press flex items-center gap-2 text-primary-text hover:underline" href="mailto:hello@agura.rw">
              <MessageSquare aria-hidden className="h-4 w-4" />
              hello@agura.rw
            </a>
            <a className="press flex items-center gap-2 text-primary-text hover:underline" href="tel:+250788000000">
              <Phone aria-hidden className="h-4 w-4" />
              +250 788 000 000
            </a>
            <a className="press flex items-center gap-2 text-primary-text hover:underline" href="#faq-title">
              <CircleHelp aria-hidden className="h-4 w-4" />
              {t("landing.footer.privacy")}
            </a>
          </div>
          <div className="space-y-2 text-sm">
            <h2 className="text-sm font-medium text-ink-heading">{t("landing.footer.language")}</h2>
            <LanguageSwitcher />
            <div className="flex flex-wrap gap-2 pt-2">
              <Link to="/sign-in">
                <Button variant="secondary" size="sm">
                  {t("landing.nav.signIn")}
                </Button>
              </Link>
              <Link to="/admin/sign-in">
                <Button variant="ghost" size="sm" icon={<ShieldCheck aria-hidden className="h-4 w-4" />}>
                  {t("auth.adminSignIn")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
        <div className="border-t border-line">
          <p className="muted mx-auto max-w-content px-4 py-6 text-xs sm:px-6">
            {t("landing.footer.rights")}
          </p>
        </div>
      </footer>
    </div>
  );
}

/** Products list and the accordion detail page with the province card. */

import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ChevronDown,
  Clock,
  Info,
  Leaf,
  Search,
  Sprout,
  Users,
} from "lucide-react";
import { productsApi } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import { formatDate, formatPercent } from "../../lib/utils";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Skeleton,
} from "../../components/ui";
import type { AgeGroup, ProductDetail } from "../../lib/api/types";

export function ProductsScreen() {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["products", search],
    queryFn: () => productsApi.list({ q: search || undefined, page_size: 50 }),
  });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{t("products.title")}</h1>

      <Field label={t("products.search")} htmlFor="productSearch">
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-ink-muted" />
          <Input
            id="productSearch"
            className="pl-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </Field>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      ) : isError ? (
        <ErrorState title={t("common.error")} retryLabel={t("common.retry")} onRetry={() => void refetch()} />
      ) : !data?.items.length ? (
        <EmptyState title={t("common.empty")} icon={<Leaf aria-hidden className="h-8 w-8 text-primary-text" />} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {data.items.map((product) => (
            <li key={product.id}>
              <Link to={`/app/products/${product.id}`} className="block">
                <Card className="h-full space-y-2 transition hover:border-primary">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-semibold">{product.name_rw ?? product.name_en}</h2>
                    <Badge tone="success">{t("status.trackable")}</Badge>
                  </div>
                  {product.description_en ? (
                    <p className="muted line-clamp-2 text-sm">{product.description_en}</p>
                  ) : null}
                  <p className="flex items-center gap-1 text-sm">
                    <Clock aria-hidden className="h-4 w-4" />
                    {t("products.daysToHarvest")}: {product.time_to_harvest_min_days ?? "-"} to{" "}
                    {product.time_to_harvest_max_days ?? "-"}
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const AGE_GROUP_KEYS: Array<{ group: AgeGroup; label: string }> = [
  { group: "kids_1_5", label: "1 to 5" },
  { group: "children_6_12", label: "6 to 12" },
  { group: "young_13_24", label: "13 to 24" },
  { group: "adults", label: "Adults" },
  { group: "older_60_plus", label: "60 plus" },
];

interface Section {
  id: string;
  title: string;
  body: React.ReactNode;
}

export function ProductDetailScreen() {
  const { id } = useParams();
  const { t, language } = useI18n();
  const navigate = useNavigate();
  const [openSection, setOpenSection] = useState<string>("details");
  const [activeAgeGroup, setActiveAgeGroup] = useState<AgeGroup>("adults");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["products", id],
    queryFn: () => productsApi.detail(id as string),
    enabled: Boolean(id),
  });

  const sections = useMemo<Section[]>(() => {
    if (!data) return [];
    const product: ProductDetail = data;
    const benefit = product.benefits.find((item) => item.age_group === activeAgeGroup);

    return [
      {
        id: "details",
        title: t("products.benefits"),
        body: (
          <div className="space-y-2">
            <p className="muted text-sm">{product.description_rw ?? product.description_en}</p>
            <div className="flex flex-wrap gap-1" role="tablist" aria-label={t("products.benefits")}>
              {AGE_GROUP_KEYS.map((item) => (
                <button
                  key={item.group}
                  role="tab"
                  aria-selected={activeAgeGroup === item.group}
                  className={
                    activeAgeGroup === item.group
                      ? "tap-target rounded-lg bg-primary px-3 text-sm text-primary-on"
                      : "tap-target rounded-lg bg-surface-raised px-3 text-sm "
                  }
                  onClick={() => setActiveAgeGroup(item.group)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <p className="text-sm">{benefit?.benefit_text ?? t("products.educationalNote")}</p>
          </div>
        ),
      },
      {
        id: "nutrients",
        title: t("products.nutrients"),
        body: product.nutrients.length ? (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">{t("products.nutrients")}</caption>
            <thead>
              <tr className="text-left">
                <th scope="col">Nutrient</th>
                <th scope="col">Amount</th>
                <th scope="col">Source</th>
              </tr>
            </thead>
            <tbody>
              {product.nutrients.map((nutrient) => (
                <tr key={nutrient.nutrient} className="border-t border-line ">
                  <td className="py-1.5">{nutrient.nutrient}</td>
                  <td className="py-1.5">
                    {nutrient.amount_per_100g ?? "-"} {nutrient.unit ?? ""}
                  </td>
                  <td className="muted py-1.5">{nutrient.source ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        ) : (
          <p className="muted text-sm">{t("admin.ai.notice")}</p>
        ),
      },
      {
        id: "conditions",
        title: t("products.conditions"),
        body: (
          <div className="space-y-2">
            <p className="text-sm">{product.conditions_diseases ?? "-"}</p>
            <p className="flex items-start gap-2 rounded-xl bg-warning-tint p-3 text-sm">
              <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
              {t("products.educationalNote")}
            </p>
            {product.reviewer_name ? (
              <p className="muted text-xs">
                {t("products.reviewedBy", {
                  name: product.reviewer_name,
                  date: formatDate(product.review_date, language),
                })}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        id: "cautions",
        title: t("products.howNotToUse"),
        body: (
          <p className="flex items-start gap-2 rounded-xl border border-warning bg-warning-tint p-3 text-sm">
            <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
            {product.how_not_to_use ?? "-"}
          </p>
        ),
      },
      { id: "preserve", title: t("products.preserve"), body: <p className="text-sm">{product.how_to_preserve ?? "-"}</p> },
      {
        id: "recipes",
        title: t("products.recipes"),
        body: (
          <ul className="space-y-2">
            {product.recipes.map((recipe) => (
              <li key={recipe.name} className="rounded-xl bg-surface-raised p-3 text-sm ">
                <p className="font-medium">{recipe.name}</p>
                <p className="muted">{recipe.ingredients?.join(", ")}</p>
                {recipe.steps ? <p>{recipe.steps}</p> : null}
              </li>
            ))}
          </ul>
        ),
      },
      {
        id: "irrigation",
        title: t("products.irrigation"),
        body: (
          <p className="text-sm">
            {product.irrigation_method ?? "-"} ({product.irrigation_frequency ?? "-"},{" "}
            {product.irrigation_time_of_day ?? "-"})
          </p>
        ),
      },
      {
        id: "harvest",
        title: t("products.harvest"),
        body: (
          <p className="text-sm">
            {product.time_to_harvest_min_days ?? "-"} to {product.time_to_harvest_max_days ?? "-"} days.{" "}
            {product.harvest_method ?? ""}
          </p>
        ),
      },
      {
        id: "resources",
        title: t("products.resources"),
        body: (
          <ul className="space-y-1 text-sm">
            {product.resources.map((resource) => (
              <li key={resource.name} className="flex justify-between gap-3 border-b border-line py-1 ">
                <span>{resource.name}</span>
                <span className="muted">
                  {resource.quantity ?? "-"} {resource.estimated_cost ? `(${resource.estimated_cost} RWF)` : ""}
                </span>
              </li>
            ))}
          </ul>
        ),
      },
      {
        id: "schedule",
        title: t("products.schedule"),
        body: (
          <ol className="space-y-2 text-sm">
            {product.schedule_tasks.map((task) => (
              <li key={task.id} className="flex gap-2">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
                <span>
                  <span className="font-medium">Day {task.day_offset}</span>, {task.time_of_day}.{" "}
                  {task.instruction_text}
                </span>
              </li>
            ))}
          </ol>
        ),
      },
    ];
  }, [data, t, activeAgeGroup, language]);

  if (isLoading) return <Skeleton className="h-72" />;
  if (isError || !data)
    return <ErrorState title={t("common.error")} retryLabel={t("common.retry")} onRetry={() => void refetch()} />;

  const context = data.province_context;

  return (
    <div className="space-y-5 pb-24">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">{data.name_rw ?? data.name_en}</h1>
        <p className="muted text-sm">{data.name_en}</p>
      </header>

      {context ? (
        <Card className="flex items-center gap-3">
          <Users aria-hidden className="h-5 w-5 text-primary-text" />
          <p className="text-sm">
            {context.available && context.share !== null
              ? t("products.provinceContext", {
                  share: formatPercent(context.share, 1),
                  year: context.source_year ?? "",
                })
              : context.suppressed
                ? t(context.translation_key ?? "products.suppressed")
                : t("analysis.not_available")}
            {context.source_name ? <span className="muted block text-xs">{context.source_name}</span> : null}
          </p>
        </Card>
      ) : null}

      <div className="lg:flex lg:gap-6">
        <nav className="mb-3 flex gap-1 overflow-x-auto lg:mb-0 lg:w-56 lg:shrink-0 lg:flex-col">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              aria-expanded={openSection === section.id}
              className={
                openSection === section.id
                  ? "tap-target whitespace-nowrap rounded-lg bg-primary-tint px-3 text-sm font-semibold text-primary-text "
                  : "tap-target whitespace-nowrap rounded-lg px-3 text-sm hover:bg-surface-raised "
              }
              onClick={() => setOpenSection(section.id)}
            >
              {section.title}
            </button>
          ))}
        </nav>

        <div className="min-w-0 flex-1 space-y-2">
          {sections.map((section) => (
            <section key={section.id} className="card">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 text-left font-semibold"
                aria-expanded={openSection === section.id}
                aria-controls={`section-${section.id}`}
                onClick={() => setOpenSection(openSection === section.id ? "" : section.id)}
              >
                {section.title}
                <ChevronDown
                  aria-hidden
                  className={openSection === section.id ? "h-5 w-5 rotate-180" : "h-5 w-5"}
                />
              </button>
              {openSection === section.id ? (
                <div id={`section-${section.id}`} className="mt-3">
                  {section.body}
                </div>
              ) : null}
            </section>
          ))}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-16 z-10 flex gap-2 border-t border-line bg-surface p-3 lg:bottom-0 ">
        <Button fullWidth icon={<Sprout aria-hidden className="h-4 w-4" />} onClick={() => navigate(`/app/products/${data.id}/plant`)}>
          {t("products.plant")}
        </Button>
        <Button variant="secondary" onClick={() => navigate("/app/help")}>
          {t("products.getSpecialist")}
        </Button>
      </div>
    </div>
  );
}

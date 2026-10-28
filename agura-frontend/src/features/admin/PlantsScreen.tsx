/**
 * Census analysis: mushroom adoption, declared food by province, diet diversity
 * and household readiness. Every withheld cell says so; nothing is silently zero.
 */

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { adminAnalysisApi } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import { formatNumber, formatPercent } from "../../lib/utils";
import { Badge, Card, ErrorState, Select, Skeleton } from "../../components/ui";
import { ShareBarChart } from "../../components/charts";
import type { MushroomCell, SuppressedValue } from "../../lib/api/types";

const LEVELS = ["province", "district", "sector"] as const;
const TABS = ["mushroom", "food", "readiness"] as const;

type Tab = (typeof TABS)[number];

interface AnalysisMeta {
  survey_name?: string;
  survey_year?: number;
  source_name?: string;
  source_year?: number;
  small_cell_threshold?: number;
}

interface FoodRow {
  food_item_id: string | null;
  level: string;
  province: string | null;
  district: string | null;
  sector: string | null;
  standard_name: string | null;
  group: string | null;
  households_total: SuppressedValue;
  households_with_food: SuppressedValue;
  share: SuppressedValue;
}

interface ReadinessRow {
  level: string;
  province: string | null;
  district: string | null;
  sector: string | null;
  households_total: SuppressedValue;
  score: SuppressedValue;
  components: Record<string, { weighted_share?: number | null; suppressed?: boolean; definition_source?: string }>;
}

/** A withheld cell is labelled with the reason, never shown as 0 or blank. */
function Cell({ cell }: { cell: SuppressedValue }) {
  const { t } = useI18n();
  if (cell.suppressed) return <Badge tone="warning">{t(cell.translation_key ?? "status.suppressed")}</Badge>;
  if (cell.value === null) return <span className="muted">-</span>;
  return <span>{formatPercent(cell.value)}</span>;
}

function unitLabel(row: { province: string | null; district: string | null; sector: string | null; level: string }) {
  return row.province ?? row.district ?? row.sector ?? row.level;
}

function Meta({ meta }: { meta: AnalysisMeta | undefined }) {
  if (!meta) return null;
  return (
    <p className="muted text-xs">
      {meta.survey_name ? `${meta.survey_name}` : ""}
      {meta.survey_year ? `, ${meta.survey_year}` : ""}
      {meta.source_name ? ` - ${meta.source_name}` : ""}
      {meta.small_cell_threshold ? ` - small cell threshold ${meta.small_cell_threshold}` : ""}
    </p>
  );
}

export function PlantsScreen() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("mushroom");
  const [level, setLevel] = useState<string>("province");

  const mushroom = useQuery({
    queryKey: ["admin-analysis", "mushroom", level],
    queryFn: () => adminAnalysisApi.mushroom({ level }),
    enabled: tab === "mushroom",
  });
  const food = useQuery({
    queryKey: ["admin-analysis", "food", level],
    queryFn: () => adminAnalysisApi.foodSummary({ level, limit: 200 }),
    enabled: tab === "food",
  });
  const readiness = useQuery({
    queryKey: ["admin-analysis", "readiness", level],
    queryFn: () => adminAnalysisApi.readiness({ level }),
    enabled: tab === "readiness",
  });

  const mushroomRows = (mushroom.data?.items ?? []) as MushroomCell[];
  const mushroomChart = useMemo(
    () =>
      mushroomRows
        .filter((row) => !row.share.suppressed && row.share.value !== null)
        .slice(0, 12)
        .map((row) => ({ label: unitLabel(row), value: row.share.value })),
    [mushroomRows],
  );

  const foodRows = (food.data?.items ?? []) as unknown as FoodRow[];
  const foodChart = useMemo(() => {
    const seen = new Map<string, { label: string; total: number; count: number }>();
    for (const row of foodRows) {
      if (row.share.suppressed || row.share.value === null || !row.standard_name) continue;
      const entry = seen.get(row.standard_name) ?? { label: row.standard_name, total: 0, count: 0 };
      entry.total += row.share.value;
      entry.count += 1;
      seen.set(row.standard_name, entry);
    }
    return Array.from(seen.values())
      .map((entry) => ({ label: entry.label, value: entry.total / entry.count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);
  }, [foodRows]);

  const readinessRows = (readiness.data?.items ?? []) as unknown as ReadinessRow[];
  const readinessChart = readinessRows
    .filter((row) => !row.score.suppressed && row.score.value !== null)
    .slice(0, 12)
    .map((row) => ({ label: unitLabel(row), value: (row.score.value ?? 0) / 100 }));

  const meta = (mushroom.data?.meta ?? food.data?.meta ?? readiness.data?.meta) as AnalysisMeta | undefined;
  const active = tab === "mushroom" ? mushroom : tab === "food" ? food : readiness;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t("nav.plants")}</h1>
        <div className="w-40">
          <Select aria-label="level" value={level} onChange={(event) => setLevel(event.target.value)}>
            {LEVELS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto" role="tablist" aria-label={t("nav.plants")}>
        {TABS.map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            className={
              tab === value
                ? "tap-target whitespace-nowrap rounded-lg bg-primary px-3 text-sm text-primary-on"
                : "tap-target whitespace-nowrap rounded-lg bg-surface-raised px-3 text-sm"
            }
            onClick={() => setTab(value)}
          >
            {t(`analysis.tab.${value}`)}
          </button>
        ))}
      </div>

      <Meta meta={meta} />

      {active.isLoading ? <Skeleton className="h-40" /> : null}
      {active.isError ? (
        <ErrorState title={t("common.error")} retryLabel={t("common.retry")} onRetry={() => void active.refetch()} />
      ) : null}

      {tab === "mushroom" ? (
        <>
          <Card className="space-y-2">
            <h2 className="font-semibold">{t("analysis.mushroom")}</h2>
            <ShareBarChart data={mushroomChart} />
            <p className="muted flex items-start gap-1 text-xs">
              <Info aria-hidden className="mt-0.5 h-3 w-3 shrink-0" />
              {t("analysis.suppressionNote")}
            </p>
          </Card>

          {mushroomRows.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">{t("analysis.mushroom")}</caption>
                <thead>
                  <tr className="text-left">
                    <th scope="col">{level}</th>
                    <th scope="col">Households</th>
                    <th scope="col">Growing</th>
                    <th scope="col">Share</th>
                    <th scope="col">Urban</th>
                    <th scope="col">Rural</th>
                    <th scope="col">Female headed</th>
                  </tr>
                </thead>
                <tbody>
                  {mushroomRows.map((row) => (
                    <tr
                      key={`${row.level}-${row.province}-${row.district}-${row.sector}`}
                      className="border-t border-line"
                    >
                      <th scope="row" className="py-1.5 text-left font-medium">
                        {unitLabel(row)}
                      </th>
                      <td className="py-1.5">
                        {row.households_total.suppressed ? "-" : formatNumber(row.households_total.count)}
                      </td>
                      <td className="py-1.5">
                        {row.mushroom_households.suppressed ? "-" : formatNumber(row.mushroom_households.count)}
                      </td>
                      <td className="py-1.5">
                        <Cell cell={row.share} />
                      </td>
                      <td className="py-1.5">
                        <Cell cell={row.urban_share_of_mushroom} />
                      </td>
                      <td className="py-1.5">
                        <Cell cell={row.rural_share_of_mushroom} />
                      </td>
                      <td className="py-1.5">
                        <Cell cell={row.female_headed_share} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      ) : null}

      {tab === "food" ? (
        <>
          <Card className="space-y-2">
            <h2 className="font-semibold">{t("analysis.food")}</h2>
            <ShareBarChart data={foodChart} />
            <p className="muted text-xs">{t("analysis.foodNote")}</p>
          </Card>

          {foodRows.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">{t("analysis.food")}</caption>
                <thead>
                  <tr className="text-left">
                    <th scope="col">Food</th>
                    <th scope="col">Group</th>
                    <th scope="col">{level}</th>
                    <th scope="col">Households</th>
                    <th scope="col">With food</th>
                    <th scope="col">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {foodRows.slice(0, 60).map((row, index) => (
                    <tr
                      key={`${row.food_item_id ?? index}-${row.province}-${row.district}-${row.sector}`}
                      className="border-t border-line"
                    >
                      <th scope="row" className="py-1.5 text-left font-medium">
                        {row.standard_name ?? "-"}
                      </th>
                      <td className="muted py-1.5 text-xs">
                        {row.group ? t(`analysis.group.${row.group}`) : "-"}
                      </td>
                      <td className="py-1.5">{unitLabel(row)}</td>
                      <td className="py-1.5">
                        {row.households_total.suppressed ? "-" : formatNumber(row.households_total.count)}
                      </td>
                      <td className="py-1.5">
                        {row.households_with_food.suppressed ? "-" : formatNumber(row.households_with_food.count)}
                      </td>
                      <td className="py-1.5">
                        <Cell cell={row.share} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      ) : null}

      {tab === "readiness" ? (
        <>
          <Card className="space-y-2">
            <h2 className="font-semibold">{t("analysis.readiness")}</h2>
            <ShareBarChart data={readinessChart} />
            <p className="muted text-xs">{t("analysis.readinessNote")}</p>
          </Card>

          {readinessRows.length ? (
            <ul className="space-y-2">
              {readinessRows.slice(0, 20).map((row) => {
                const components = Object.entries(row.components);
                return (
                  <li key={`${row.level}-${row.province}-${row.district}-${row.sector}`} className="card space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-medium">{unitLabel(row)}</h3>
                      <Badge tone="info">
                        {row.score.suppressed
                          ? t("status.suppressed")
                          : `${(row.score.value ?? 0).toFixed(1)} / 100`}
                      </Badge>
                    </div>
                    <ul className="grid gap-1 text-xs sm:grid-cols-2">
                      {components.map(([key, component]) => (
                        <li key={key} className="flex items-center justify-between gap-2">
                          <span className="muted">{key.replace(/_/g, " ")}</span>
                          <span>
                            {component.suppressed || component.weighted_share === null || component.weighted_share === undefined
                              ? t("status.suppressed")
                              : formatPercent(component.weighted_share)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {components.some(([, component]) => component.definition_source === "configured_codes") ? (
                      <p className="text-xs text-warning">{t("analysis.configuredCodes")}</p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

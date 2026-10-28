/** Before you plant checklist, then the confirmation with the first three tasks. */

import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, CheckCircle2, Circle, Sparkles } from "lucide-react";
import { plantingsApi, productsApi } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import { formatDate, formatKigaliTime, todayIso } from "../../lib/utils";
import { Button, Card, Field, Input, Skeleton } from "../../components/ui";
import type { PlantingCreateResponse } from "../../lib/api/types";

export function PlantScreen() {
  const { id } = useParams();
  const { t, language } = useI18n();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [startedOn, setStartedOn] = useState(todayIso());
  const [owned, setOwned] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState<PlantingCreateResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: product, isLoading } = useQuery({
    queryKey: ["products", id],
    queryFn: () => productsApi.detail(id as string),
    enabled: Boolean(id),
  });

  const resources = useMemo(() => product?.resources ?? [], [product]);
  const estimatedCost = resources.reduce((total, item) => total + (item.estimated_cost ?? 0), 0);
  const missing = resources.filter((item) => !owned[item.name]);

  async function plant() {
    if (!product) return;
    setBusy(true);
    setError(null);
    try {
      const response = await plantingsApi.create({
        product_id: product.id,
        quantity,
        started_on: startedOn,
        checklist: resources.map((item) => ({ ...item, owned: Boolean(owned[item.name]) })),
      });
      setResult(response);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) return <Skeleton className="h-64" />;
  if (!product) return null;

  if (result) {
    return (
      <div className="space-y-4">
        <Card className="space-y-2">
          <p className="flex items-center gap-2 text-lg font-semibold">
            <CheckCircle2 aria-hidden className="h-5 w-5 text-primary-text" />
            {t("plantings.title")}
          </p>
          <p className="muted text-sm">
            <CalendarCheck aria-hidden className="mr-1 inline h-4 w-4" />
            {t("plantings.daysLeft")}: {result.expected_harvest_on ? formatDate(result.expected_harvest_on, language) : "-"}
          </p>
        </Card>

        <div>
          <h2 className="mb-2 font-semibold">{t("tasks.today")}</h2>
          <ul className="space-y-2">
            {result.first_tasks.map((task) => (
              <li key={task.id} className="card flex items-center justify-between gap-3">
                <span className="text-sm">{task.instruction_text}</span>
                <span className="muted shrink-0 text-xs">
                  {formatDate(task.due_at, language)} {formatKigaliTime(task.due_at)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex gap-2">
          <Button fullWidth onClick={() => navigate(`/app/plantings/${result.planting.id}`)}>
            {t("plantings.title")}
          </Button>
          <Button variant="secondary" onClick={() => navigate("/app/today")}>
            {t("tasks.today")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("checklist.title")}</h1>
      <p className="muted text-sm">{product.name_rw ?? product.name_en}</p>

      <Card className="space-y-2">
        <h2 className="font-semibold">{t("products.resources")}</h2>
        <ul className="space-y-1.5">
          {resources.map((resource) => {
            const isOwned = Boolean(owned[resource.name]);
            return (
              <li key={resource.name}>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-primary"
                    checked={isOwned}
                    onChange={(event) =>
                      setOwned((current) => ({ ...current, [resource.name]: event.target.checked }))
                    }
                  />
                  {isOwned ? (
                    <CheckCircle2 aria-hidden className="h-4 w-4 text-primary-text" />
                  ) : (
                    <Circle aria-hidden className="h-4 w-4 text-ink-muted" />
                  )}
                  <span className="flex-1">{resource.name}</span>
                  <span className="muted text-xs">
                    {resource.quantity ?? ""} {resource.estimated_cost ? `${resource.estimated_cost} RWF` : ""}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
        <p className="text-sm font-medium">
          {t("checklist.estimatedCost")}: {estimatedCost} RWF
        </p>
        {missing.length ? <p className="muted text-xs">{missing.length} missing</p> : null}
      </Card>

      <Card className="grid gap-3 sm:grid-cols-2">
        <Field label={t("plantings.title")} htmlFor="quantity" required>
          <Input
            id="quantity"
            type="number"
            min={1}
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
          />
        </Field>
        <Field label={t("plantings.stage")} htmlFor="startedOn" required>
          <Input
            id="startedOn"
            type="date"
            value={startedOn}
            onChange={(event) => setStartedOn(event.target.value)}
          />
        </Field>
      </Card>

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button fullWidth loading={busy} icon={<Sparkles aria-hidden className="h-4 w-4" />} onClick={plant}>
          {t("products.plant")}
        </Button>
        <Link to={`/app/products/${product.id}`}>
          <Button variant="secondary">{t("common.back")}</Button>
        </Link>
      </div>
    </div>
  );
}

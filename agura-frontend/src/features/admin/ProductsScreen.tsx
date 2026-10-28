/**
 * Products: the three step editor that produces a trackable product, plus the
 * status table with the exact blockers that stop publication.
 */

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, BookOpen, CheckCircle2, Circle, PauseCircle, Plus, Trash2 } from "lucide-react";
import { adminProductsApi } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import { formatDate } from "../../lib/utils";
import { Badge, Button, Card, EmptyState, Field, Input, Select, Skeleton, Textarea } from "../../components/ui";
import { useToast } from "../../components/Toast";
import type { ProductDetail, ProductStatus, ScheduleTask } from "../../lib/api/types";

const STATUS_TONE: Record<ProductStatus, "neutral" | "success" | "warning" | "danger"> = {
  draft: "neutral",
  trackable: "success",
  paused: "warning",
  retired: "danger",
};

const STEPS = [
  "admin.products.form.section1",
  "admin.products.form.section2",
  "admin.products.form.schedule",
  "admin.products.form.nutrition",
];

const AGE_GROUP_KEYS = [
  "kids_1_5",
  "children_6_12",
  "young_13_24",
  "adults",
  "older_60_plus",
] as const;

function emptyTask(): ScheduleTask {
  return {
    id: crypto.randomUUID(),
    task_type: "check",
    day_offset: 0,
    repeat_rule: "once",
    repeat_weekday: null,
    repeat_interval_days: null,
    repeat_until_day: null,
    time_of_day: "morning",
    instruction_text: "",
    reminder_enabled: true,
  };
}

interface Draft {
  name_en: string;
  name_rw: string;
  description_en: string;
  description_rw: string;
  how_not_to_use: string;
  how_to_preserve: string;
  conditions_diseases: string;
  harvest_method: string;
  irrigation_method: string;
  reviewer_name: string;
  reviewer_organisation: string;
  review_date: string;
  time_to_harvest_min_days: string;
  time_to_harvest_max_days: string;
  photo_url: string;
  place_type: string;
  irrigation_frequency: string;
  irrigation_time_of_day: string;
  benefits: ProductDetail["benefits"];
  nutrients: Array<{ nutrient: string; amount_per_100g: string; unit: string }>;
  recipes: Array<{ name: string; steps: string }>;
  tasks: ScheduleTask[];
}

function draftFrom(product: ProductDetail | null): Draft {
  return {
    name_en: product?.name_en ?? "",
    name_rw: product?.name_rw ?? "",
    description_en: product?.description_en ?? "",
    description_rw: product?.description_rw ?? "",
    how_not_to_use: product?.how_not_to_use ?? "",
    how_to_preserve: product?.how_to_preserve ?? "",
    conditions_diseases: product?.conditions_diseases ?? "",
    harvest_method: product?.harvest_method ?? "",
    irrigation_method: product?.irrigation_method ?? "",
    reviewer_name: product?.reviewer_name ?? "",
    reviewer_organisation: product?.reviewer_organisation ?? "",
    review_date: product?.review_date ?? "",
    time_to_harvest_min_days: product?.time_to_harvest_min_days?.toString() ?? "",
    time_to_harvest_max_days: product?.time_to_harvest_max_days?.toString() ?? "",
    photo_url: product?.photo_url ?? "",
    place_type: product?.place_type ?? "",
    irrigation_frequency: product?.irrigation_frequency ?? "",
    irrigation_time_of_day: product?.irrigation_time_of_day ?? "",
    // One row per age group is what the trackable check requires, so start with
    // all five rather than making the admin discover the requirement.
    benefits: AGE_GROUP_KEYS.map((ageGroup) => ({
      age_group: ageGroup,
      benefit_text:
        product?.benefits.find((benefit) => benefit.age_group === ageGroup)?.benefit_text ?? "",
    })),
    nutrients:
      product?.nutrients.map((nutrient) => ({
        nutrient: nutrient.nutrient,
        amount_per_100g: nutrient.amount_per_100g?.toString() ?? "",
        unit: nutrient.unit ?? "",
      })) ?? [],
    recipes: product?.recipes.map((recipe) => ({ name: recipe.name, steps: recipe.steps ?? "" })) ?? [],
    tasks: product?.schedule_tasks ?? [emptyTask()],
  };
}

function ProductEditor({ product, onClose }: { product: ProductDetail | null; onClose: () => void }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(() => draftFrom(product));
  const [busy, setBusy] = useState(false);

  // The blockers belong to the product being edited, which is where an admin
  // can act on them. Listing them in the table turned it into a wall of text.
  const blockers = useQuery({
    queryKey: ["admin-product-blockers", product?.id],
    queryFn: () => adminProductsApi.blockers(product!.id),
    enabled: Boolean(product?.id),
  });

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function payload() {
    return {
      name_en: draft.name_en,
      name_rw: draft.name_rw || null,
      description_en: draft.description_en || null,
      description_rw: draft.description_rw || null,
      how_not_to_use: draft.how_not_to_use || null,
      how_to_preserve: draft.how_to_preserve || null,
      conditions_diseases: draft.conditions_diseases || null,
      harvest_method: draft.harvest_method || null,
      irrigation_method: draft.irrigation_method || null,
      reviewer_name: draft.reviewer_name || null,
      reviewer_organisation: draft.reviewer_organisation || null,
      review_date: draft.review_date || null,
      time_to_harvest_min_days: draft.time_to_harvest_min_days ? Number(draft.time_to_harvest_min_days) : null,
      time_to_harvest_max_days: draft.time_to_harvest_max_days ? Number(draft.time_to_harvest_max_days) : null,
      photo_url: draft.photo_url || null,
      place_type: draft.place_type || null,
      irrigation_frequency: draft.irrigation_frequency || null,
      irrigation_time_of_day: draft.irrigation_time_of_day || null,
      nutrients: draft.nutrients
        .filter((nutrient) => nutrient.nutrient.trim())
        .map((nutrient) => ({
          nutrient: nutrient.nutrient,
          amount_per_100g: nutrient.amount_per_100g ? Number(nutrient.amount_per_100g) : null,
          unit: nutrient.unit || null,
        })),
      recipes: draft.recipes
        .filter((recipe) => recipe.name.trim())
        .map((recipe) => ({ name: recipe.name, steps: recipe.steps || null })),
      benefits: draft.benefits.filter((benefit) => (benefit.benefit_text ?? "").trim()),
      schedule_tasks: draft.tasks
        .filter((task) => task.instruction_text.trim())
        .map(({ id: _id, ...task }) => task),
    };
  }

  async function save(publish = false) {
    setBusy(true);
    try {
      const saved = product
        ? await adminProductsApi.update(product.id, payload())
        : await adminProductsApi.create(payload());
      if (publish) await adminProductsApi.markTrackable(saved.id);
      toast.push(publish ? t("admin.products.markTrackable") : t("common.saved"), "success");
      void queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-product-blockers"] });
      onClose();
    } catch (caught) {
      toast.push(caught instanceof Error ? caught.message : t("common.error"), "warning");
    } finally {
      setBusy(false);
    }
  }

  const openBlockers = blockers.data ?? [];

  return (
    <Card className="space-y-4">
      {openBlockers.length ? (
        <div className="rounded-xl border border-line bg-surface-raised p-4">
          <h3 className="flex items-center gap-2 font-semibold text-warning">
            <AlertTriangle aria-hidden className="h-4 w-4" />
            {t("admin.products.blocked")}
          </h3>
          <p className="muted mt-1 text-sm">{t("admin.products.blockedHint")}</p>
          <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
            {openBlockers.map((blocker) => (
              <li key={blocker.field} className="flex items-start gap-2">
                <Circle aria-hidden className="mt-1 h-2 w-2 shrink-0 text-warning" />
                <span>{t(blocker.translation_key)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <ol className="flex flex-wrap gap-2" aria-label={t("admin.products.form.preview")}>
        {STEPS.map((key, index) => (
          <li key={key}>
            <button
              type="button"
              aria-current={step === index ? "step" : undefined}
              className={
                step === index
                  ? "tap-target rounded-lg bg-primary px-3 text-sm text-primary-on"
                  : "tap-target rounded-lg bg-surface-raised px-3 text-sm"
              }
              onClick={() => setStep(index)}
            >
              {index + 1}. {t(key)}
            </button>
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <div className="space-y-3">
          <Field label="Name (English)" htmlFor="nameEn" required>
            <Input id="nameEn" value={draft.name_en} onChange={(event) => set("name_en", event.target.value)} />
          </Field>
          <Field label="Izina (Kinyarwanda)" htmlFor="nameRw">
            <Input id="nameRw" value={draft.name_rw} onChange={(event) => set("name_rw", event.target.value)} />
          </Field>
          <Field label="Description (English)" htmlFor="descEn">
            <Textarea id="descEn" rows={3} value={draft.description_en} onChange={(event) => set("description_en", event.target.value)} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("admin.products.form.photo")} htmlFor="photoUrl">
              <Input
                id="photoUrl"
                type="url"
                value={draft.photo_url}
                onChange={(event) => set("photo_url", event.target.value)}
              />
            </Field>
            <Field label={t("admin.products.form.place")} htmlFor="placeType">
              <Input
                id="placeType"
                value={draft.place_type}
                onChange={(event) => set("place_type", event.target.value)}
              />
            </Field>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t("products.benefits")}</legend>
            <p className="muted text-xs">{t("admin.products.form.benefitsHint")}</p>
            {draft.benefits.map((benefit, index) => (
              <Field
                key={benefit.age_group}
                label={t(`admin.products.age.${benefit.age_group}`)}
                htmlFor={`benefit-${benefit.age_group}`}
              >
                <Textarea
                  id={`benefit-${benefit.age_group}`}
                  rows={2}
                  value={benefit.benefit_text ?? ""}
                  onChange={(event) =>
                    set(
                      "benefits",
                      draft.benefits.map((item, i) =>
                        i === index ? { ...item, benefit_text: event.target.value } : item,
                      ),
                    )
                  }
                />
              </Field>
            ))}
          </fieldset>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-3">
          <Field label={t("products.conditions")} htmlFor="conditions" required>
            <Textarea
              id="conditions"
              rows={2}
              value={draft.conditions_diseases}
              onChange={(event) => set("conditions_diseases", event.target.value)}
            />
          </Field>
          <Field label={t("products.howNotToUse")} htmlFor="howNotToUse" required>
            <Textarea
              id="howNotToUse"
              rows={2}
              value={draft.how_not_to_use}
              onChange={(event) => set("how_not_to_use", event.target.value)}
            />
          </Field>
          <Field label={t("products.preserve")} htmlFor="preserve">
            <Textarea id="preserve" rows={2} value={draft.how_to_preserve} onChange={(event) => set("how_to_preserve", event.target.value)} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("products.irrigation")} htmlFor="irrigation" required>
              <Input id="irrigation" value={draft.irrigation_method} onChange={(event) => set("irrigation_method", event.target.value)} />
            </Field>
            <Field label={t("admin.products.form.irrigationFrequency")} htmlFor="irrigationFrequency">
              <Select
                id="irrigationFrequency"
                value={draft.irrigation_frequency}
                onChange={(event) => set("irrigation_frequency", event.target.value)}
              >
                <option value="">-</option>
                <option value="daily">{t("admin.products.form.daily")}</option>
                <option value="weekly">{t("admin.products.form.weekly")}</option>
                <option value="custom">{t("admin.products.form.custom")}</option>
              </Select>
            </Field>
            <Field label={t("admin.products.form.irrigationTime")} htmlFor="irrigationTime">
              <Select
                id="irrigationTime"
                value={draft.irrigation_time_of_day}
                onChange={(event) => set("irrigation_time_of_day", event.target.value)}
              >
                <option value="">-</option>
                <option value="morning">{t("admin.products.form.morning")}</option>
                <option value="evening">{t("admin.products.form.evening")}</option>
              </Select>
            </Field>
            <Field label={t("products.harvest")} htmlFor="harvestMethod" required>
              <Input id="harvestMethod" value={draft.harvest_method} onChange={(event) => set("harvest_method", event.target.value)} />
            </Field>
            <Field label="Days to harvest (min)" htmlFor="minDays" required>
              <Input
                id="minDays"
                type="number"
                min={0}
                value={draft.time_to_harvest_min_days}
                onChange={(event) => set("time_to_harvest_min_days", event.target.value)}
              />
            </Field>
            <Field label="Days to harvest (max)" htmlFor="maxDays" required>
              <Input
                id="maxDays"
                type="number"
                min={0}
                value={draft.time_to_harvest_max_days}
                onChange={(event) => set("time_to_harvest_max_days", event.target.value)}
              />
            </Field>
            <Field label="Reviewer name" htmlFor="reviewerName" required>
              <Input id="reviewerName" value={draft.reviewer_name} onChange={(event) => set("reviewer_name", event.target.value)} />
            </Field>
            <Field label="Reviewer organisation" htmlFor="reviewerOrg" required>
              <Input
                id="reviewerOrg"
                value={draft.reviewer_organisation}
                onChange={(event) => set("reviewer_organisation", event.target.value)}
              />
            </Field>
            <Field label="Review date" htmlFor="reviewDate" required>
              <Input id="reviewDate" type="date" value={draft.review_date} onChange={(event) => set("review_date", event.target.value)} />
            </Field>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-3">
          <p className="muted text-xs">{t("admin.ai.notice")}</p>
          <ul className="space-y-2">
            {draft.tasks.map((task, index) => (
              <li key={task.id} className="rounded-xl border border-line p-3">
                <div className="grid gap-2 sm:grid-cols-4">
                  <Field label="Day" htmlFor={`day-${task.id}`}>
                    <Input
                      id={`day-${task.id}`}
                      type="number"
                      min={0}
                      value={task.day_offset}
                      onChange={(event) =>
                        set(
                          "tasks",
                          draft.tasks.map((item, i) =>
                            i === index ? { ...item, day_offset: Number(event.target.value) } : item,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Field label="Time" htmlFor={`time-${task.id}`}>
                    <Select
                      id={`time-${task.id}`}
                      value={task.time_of_day}
                      onChange={(event) =>
                        set(
                          "tasks",
                          draft.tasks.map((item, i) =>
                            i === index ? { ...item, time_of_day: event.target.value as ScheduleTask["time_of_day"] } : item,
                          ),
                        )
                      }
                    >
                      <option value="morning">{t("tasks.morning")}</option>
                      <option value="evening">{t("tasks.evening")}</option>
                    </Select>
                  </Field>
                  <Field label="Repeat" htmlFor={`repeat-${task.id}`}>
                    <Select
                      id={`repeat-${task.id}`}
                      value={task.repeat_rule}
                      onChange={(event) =>
                        set(
                          "tasks",
                          draft.tasks.map((item, i) =>
                            i === index ? { ...item, repeat_rule: event.target.value as ScheduleTask["repeat_rule"] } : item,
                          ),
                        )
                      }
                    >
                      <option value="once">once</option>
                      <option value="daily">daily</option>
                      <option value="weekly">weekly</option>
                    </Select>
                  </Field>
                  <Field label="Type" htmlFor={`type-${task.id}`}>
                    <Select
                      id={`type-${task.id}`}
                      value={task.task_type}
                      onChange={(event) =>
                        set(
                          "tasks",
                          draft.tasks.map((item, i) =>
                            i === index ? { ...item, task_type: event.target.value as ScheduleTask["task_type"] } : item,
                          ),
                        )
                      }
                    >
                      {(["irrigation", "spray_or_treatment", "check", "harvest", "other"] as const).map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <Field label="Instruction" htmlFor={`text-${task.id}`} required>
                  <Input
                    id={`text-${task.id}`}
                    value={task.instruction_text}
                    onChange={(event) =>
                      set(
                        "tasks",
                        draft.tasks.map((item, i) =>
                          i === index ? { ...item, instruction_text: event.target.value } : item,
                        ),
                      )
                    }
                  />
                </Field>
                <Button
                  variant="ghost"
                  icon={<Trash2 aria-hidden className="h-4 w-4" />}
                  onClick={() => set("tasks", draft.tasks.filter((_, i) => i !== index))}
                >
                  {t("common.cancel")}
                </Button>
              </li>
            ))}
          </ul>
          <Button variant="secondary" icon={<Plus aria-hidden className="h-4 w-4" />} onClick={() => set("tasks", [...draft.tasks, emptyTask()])}>
            {t("admin.products.form.schedule")}
          </Button>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4">
          <section className="space-y-2">
            <h3 className="font-semibold">{t("products.nutrients")}</h3>
            <p className="muted text-xs">{t("admin.products.form.nutrientsHint")}</p>
            <ul className="space-y-2">
              {draft.nutrients.map((nutrient, index) => (
                <li key={`nutrient-${index}`} className="grid gap-2 sm:grid-cols-4">
                  <Field label={t("admin.products.form.nutrient")} htmlFor={`nutrient-${index}`}>
                    <Input
                      id={`nutrient-${index}`}
                      value={nutrient.nutrient}
                      onChange={(event) =>
                        set(
                          "nutrients",
                          draft.nutrients.map((item, i) =>
                            i === index ? { ...item, nutrient: event.target.value } : item,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Field label={t("admin.products.form.per100g")} htmlFor={`amount-${index}`}>
                    <Input
                      id={`amount-${index}`}
                      type="number"
                      min={0}
                      step="0.01"
                      value={nutrient.amount_per_100g}
                      onChange={(event) =>
                        set(
                          "nutrients",
                          draft.nutrients.map((item, i) =>
                            i === index ? { ...item, amount_per_100g: event.target.value } : item,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Field label={t("admin.products.form.unit")} htmlFor={`unit-${index}`}>
                    <Input
                      id={`unit-${index}`}
                      value={nutrient.unit}
                      onChange={(event) =>
                        set(
                          "nutrients",
                          draft.nutrients.map((item, i) =>
                            i === index ? { ...item, unit: event.target.value } : item,
                          ),
                        )
                      }
                    />
                  </Field>
                  <div className="flex items-end">
                    <Button
                      variant="ghost"
                      icon={<Trash2 aria-hidden className="h-4 w-4" />}
                      onClick={() =>
                        set("nutrients", draft.nutrients.filter((_, i) => i !== index))
                      }
                    >
                      {t("common.cancel")}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            <Button
              variant="secondary"
              icon={<Plus aria-hidden className="h-4 w-4" />}
              onClick={() =>
                set("nutrients", [...draft.nutrients, { nutrient: "", amount_per_100g: "", unit: "" }])
              }
            >
              {t("admin.products.form.addNutrient")}
            </Button>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">{t("products.recipes")}</h3>
            <p className="muted text-xs">{t("admin.products.form.recipesHint")}</p>
            <ul className="space-y-2">
              {draft.recipes.map((recipe, index) => (
                <li key={`recipe-${index}`} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
                  <Field label={t("admin.products.form.recipeName")} htmlFor={`recipe-${index}`}>
                    <Input
                      id={`recipe-${index}`}
                      value={recipe.name}
                      onChange={(event) =>
                        set(
                          "recipes",
                          draft.recipes.map((item, i) =>
                            i === index ? { ...item, name: event.target.value } : item,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Field label={t("admin.products.form.recipeSteps")} htmlFor={`steps-${index}`}>
                    <Textarea
                      id={`steps-${index}`}
                      rows={2}
                      value={recipe.steps}
                      onChange={(event) =>
                        set(
                          "recipes",
                          draft.recipes.map((item, i) =>
                            i === index ? { ...item, steps: event.target.value } : item,
                          ),
                        )
                      }
                    />
                  </Field>
                  <div className="flex items-end">
                    <Button
                      variant="ghost"
                      icon={<Trash2 aria-hidden className="h-4 w-4" />}
                      onClick={() => set("recipes", draft.recipes.filter((_, i) => i !== index))}
                    >
                      {t("common.cancel")}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            <Button
              variant="secondary"
              icon={<Plus aria-hidden className="h-4 w-4" />}
              onClick={() => set("recipes", [...draft.recipes, { name: "", steps: "" }])}
            >
              {t("admin.products.form.addRecipe")}
            </Button>
          </section>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" disabled={step === 0} onClick={() => setStep((current) => current - 1)}>
          {t("common.back")}
        </Button>
        <Button variant="secondary" disabled={step === STEPS.length - 1} onClick={() => setStep((current) => current + 1)}>
          {t("common.next")}
        </Button>
        <Button loading={busy} onClick={() => void save(false)}>
          {t("common.save")}
        </Button>
        <Button variant="warning" loading={busy} icon={<CheckCircle2 aria-hidden className="h-4 w-4" />} onClick={() => void save(true)}>
          {t("admin.products.markTrackable")}
        </Button>
        <Button variant="ghost" onClick={onClose}>
          {t("common.cancel")}
        </Button>
      </div>
    </Card>
  );
}

export function AdminProductsScreen() {
  const { t, language } = useI18n();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState<string | null | undefined>(undefined);
  const [page, setPage] = useState(1);

  // Paged, because a survey can create more products than fit on one screen and
  // an admin has to be able to reach every one of them to finish it off.
  const table = useQuery({
    queryKey: ["admin-products", "status-table", page],
    queryFn: () => adminProductsApi.statusTable({ page }),
  });
  const totalPages = table.data?.pagination.total_pages ?? 1;
  const detail = useQuery({
    queryKey: ["admin-products", editing],
    queryFn: () => adminProductsApi.detail(editing as string),
    enabled: Boolean(editing),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t("admin.products.title")}</h1>
        <Button icon={<Plus aria-hidden className="h-4 w-4" />} onClick={() => setEditing(null)}>
          {t("admin.products.title")}
        </Button>
      </div>

      {editing !== undefined ? (
        editing === null ? (
          <ProductEditor product={null} onClose={() => setEditing(undefined)} />
        ) : detail.data ? (
          <ProductEditor product={detail.data} onClose={() => setEditing(undefined)} />
        ) : (
          <Skeleton className="h-48" />
        )
      ) : null}

      {table.isLoading ? <Skeleton className="h-40" /> : null}

      {table.data && !table.data.items.length ? (
        <EmptyState title={t("common.empty")} icon={<BookOpen aria-hidden className="h-8 w-8 text-primary-text" />} />
      ) : null}

      {table.data?.items.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">{t("admin.products.title")}</caption>
            <thead>
              <tr className="text-left">
                <th scope="col">Name</th>
                <th scope="col">Status</th>
                <th scope="col">Reviewer</th>
                <th scope="col">Farmers</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {table.data.items.map((row) => {
                const typed = row as unknown as {
                  id: string;
                  name_en: string;
                  status: ProductStatus;
                  reviewer_name: string | null;
                  review_date: string | null;
                  farmers_planting: number;
                  blockers: Array<{ field: string; translation_key: string }>;
                };
                return (
                  <tr key={typed.id} className="border-t border-line align-top">
                    <th scope="row" className="py-2 text-left font-medium">
                      {typed.name_en}
                    </th>
                    <td className="py-2">
                      <Badge tone={STATUS_TONE[typed.status]}>{t(`status.${typed.status}`)}</Badge>
                    </td>
                    <td className="py-2">
                      {typed.reviewer_name ?? "-"}
                      {typed.review_date ? <span className="muted block text-xs">{formatDate(typed.review_date, language)}</span> : null}
                    </td>
                    <td className="py-2">{typed.farmers_planting}</td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-1">
                        <Button variant="ghost" onClick={() => setEditing(typed.id)}>
                          {t("admin.products.open")}
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={async () => {
                            const result = await adminProductsApi.markTrackable(typed.id);
                            if (result.blockers.length) {
                              toast.push(t("admin.products.blocked"), "warning");
                            } else {
                              toast.push(t("admin.products.markTrackable"), "success");
                            }
                            void queryClient.invalidateQueries({ queryKey: ["admin-products"] });
                          }}
                        >
                          {t("admin.products.markTrackable")}
                        </Button>
                        <Button
                          variant="ghost"
                          icon={<PauseCircle aria-hidden className="h-4 w-4" />}
                          onClick={async () => {
                            await adminProductsApi.pause(typed.id);
                            void queryClient.invalidateQueries({ queryKey: ["admin-products"] });
                          }}
                        >
                          {t("plantings.pause")}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {totalPages > 1 ? (
        <nav className="flex items-center justify-between gap-2" aria-label={t("admin.products.title")}>
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
            {t("common.back")}
          </Button>
          <span className="muted text-xs">
            {page} / {totalPages}
          </span>
          <Button
            variant="secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => current + 1)}
          >
            {t("common.next")}
          </Button>
        </nav>
      ) : null}
    </div>
  );
}

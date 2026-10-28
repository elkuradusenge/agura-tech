/** Funding interest form for the BRD hand-off. */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Banknote } from "lucide-react";
import { fundingApi, productsApi } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import { Button, Card, Field, Input, Select } from "../../components/ui";

const SIZES = ["under_50", "50_200", "200_500", "over_500"] as const;
const PLACES = ["own_land", "rented_land", "building", "both"] as const;
const EXPERIENCE = ["none", "some", "experienced"] as const;

export function FundingScreen() {
  const { t } = useI18n();
  const [form, setForm] = useState({
    planned_size: "50_200",
    location: "",
    building_or_land: "own_land",
    experience: "some",
    funding_needed: "",
    consent_to_share: false,
  });
  const [productId, setProductId] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const products = useQuery({
    queryKey: ["products", "forFunding"],
    queryFn: () => productsApi.list({ page_size: 50 }),
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await fundingApi.create({
        planned_size: form.planned_size,
        location: form.location,
        building_or_land: form.building_or_land,
        experience: form.experience,
        funding_needed: form.funding_needed ? Number(form.funding_needed) : undefined,
        consent_to_share: form.consent_to_share,
        product_id: productId || undefined,
      });
      setSent(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("funding.title")}</h1>
      <p className="muted text-sm">{t("funding.intro")}</p>

      <Card className="space-y-3">
        <h2 className="flex items-center gap-2 font-semibold">
          <Banknote aria-hidden className="h-5 w-5 text-primary-text" />
          {t("funding.registerInterest")}
        </h2>
        {sent ? <p className="rounded-lg bg-primary-tint p-3 text-sm text-primary-text">{t("funding.sent")}</p> : null}

        <Field label={t("funding.plannedSize")} htmlFor="plannedSize" required>
          <Select
            id="plannedSize"
            value={form.planned_size}
            onChange={(event) => update("planned_size", event.target.value)}
          >
            {SIZES.map((value) => (
              <option key={value} value={value}>
                {value.replace(/_/g, " ")}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={t("funding.location")} htmlFor="location" required>
          <Input id="location" value={form.location} onChange={(event) => update("location", event.target.value)} />
        </Field>

        <Field label={t("funding.buildingOrLand")} htmlFor="buildingOrLand" required>
          <Select
            id="buildingOrLand"
            value={form.building_or_land}
            onChange={(event) => update("building_or_land", event.target.value)}
          >
            {PLACES.map((value) => (
              <option key={value} value={value}>
                {value.replace(/_/g, " ")}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={t("funding.experience")} htmlFor="experience">
          <Select id="experience" value={form.experience} onChange={(event) => update("experience", event.target.value)}>
            {EXPERIENCE.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={t("funding.fundingNeeded")} htmlFor="fundingNeeded">
          <Input
            id="fundingNeeded"
            type="number"
            min={0}
            value={form.funding_needed}
            onChange={(event) => update("funding_needed", event.target.value)}
          />
        </Field>

        <Field label={t("funding.product")} htmlFor="fundingProduct">
          <Select id="fundingProduct" value={productId} onChange={(event) => setProductId(event.target.value)}>
            <option value="">{t("funding.anyProduct")}</option>
            {products.data?.items.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name_rw ?? product.name_en}
              </option>
            ))}
          </Select>
        </Field>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 h-5 w-5 accent-primary"
            checked={form.consent_to_share}
            onChange={(event) => update("consent_to_share", event.target.checked)}
          />
          {t("funding.consent")}
        </label>

        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}

        <Button loading={busy} disabled={!form.location.trim() || !form.consent_to_share} onClick={() => void submit()}>
          {t("help.send")}
        </Button>
      </Card>
    </div>
  );
}

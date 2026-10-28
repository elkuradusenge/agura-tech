/**
 * The admin product list shows every product a survey created, and the work
 * still needed to publish one lives in the detail view rather than in the table.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "../components/Toast";
import { I18nProvider } from "../lib/i18n";
import { AdminProductsScreen } from "../features/admin/ProductsScreen";
import rw from "../lib/i18n/rw.json";

const AI_PRODUCT = {
  id: "aaaaaaaa-1111-1111-1111-111111111111",
  name_en: "Mushroom",
  status: "draft",
  version: 1,
  reviewer_name: null,
  review_date: null,
  farmers_planting: 0,
  last_edited_at: "2026-01-16T00:00:00Z",
  blockers: [
    { field: "name_rw", translation_key: "products.missing.name_rw" },
    { field: "photo_url", translation_key: "products.missing.photo" },
  ],
};

const READY_PRODUCT = {
  id: "bbbbbbbb-2222-2222-2222-222222222222",
  name_en: "Maize",
  status: "trackable",
  version: 2,
  reviewer_name: "Dr Uwase",
  review_date: "2026-01-15",
  farmers_planting: 12,
  last_edited_at: "2026-01-16T00:00:00Z",
  blockers: [],
};

const DETAIL = {
  id: AI_PRODUCT.id,
  food_item_id: null,
  name_en: "Mushroom",
  name_rw: null,
  photo_url: null,
  description_en: null,
  description_rw: null,
  status: "draft",
  version: 1,
  how_not_to_use: null,
  how_to_preserve: null,
  conditions_diseases: null,
  harvest_method: null,
  irrigation_method: null,
  time_to_harvest_min_days: null,
  time_to_harvest_max_days: null,
  reviewer_name: null,
  reviewer_organisation: null,
  review_date: null,
  needs_expert_review: true,
  growing_steps_validated: false,
  published_at: null,
  created_at: "2026-01-16T00:00:00Z",
  updated_at: "2026-01-16T00:00:00Z",
  benefits: [],
  nutrients: [],
  recipes: [],
  schedule_tasks: [],
};

function jsonResponse(body: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } }),
  );
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("agura.language", "rw");
  vi.stubGlobal(
    "fetch",
    vi.fn((input: string | URL) => {
      const url = String(input);
      if (url.includes("/products/status-table")) {
        return jsonResponse({
          items: [AI_PRODUCT, READY_PRODUCT],
          pagination: { page: 1, page_size: 20, total: 2, total_pages: 1 },
        });
      }
      if (url.includes("/blockers")) return jsonResponse(AI_PRODUCT.blockers);
      if (url.includes(`/products/${AI_PRODUCT.id}`)) return jsonResponse(DETAIL);
      return jsonResponse({ items: [], pagination: { page: 1, page_size: 20, total: 0, total_pages: 0 } });
    }),
  );
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <I18nProvider>
        <ToastProvider>
          <AdminProductsScreen />
        </ToastProvider>
      </I18nProvider>
    </QueryClientProvider>,
  );
}

describe("admin product list", () => {
  it("lists products created from the survey", async () => {
    renderScreen();

    // A draft the survey produced and a published one both appear.
    expect(await screen.findByText("Mushroom")).toBeInTheDocument();
    expect(screen.getByText("Maize")).toBeInTheDocument();
  });

  it("keeps the blocking detail out of the table", async () => {
    renderScreen();

    await screen.findByText("Mushroom");
    // The list must not turn into a column of missing field warnings.
    expect(screen.queryByText(rw["products.missing.name_rw"])).not.toBeInTheDocument();
    expect(screen.queryByText(rw["admin.products.blocked"])).not.toBeInTheDocument();
  });

  it("shows what is still needed once a product is opened", async () => {
    renderScreen();

    await screen.findByText("Mushroom");
    const openButtons = screen.getAllByRole("button", { name: rw["admin.products.open"] });
    fireEvent.click(openButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(rw["admin.products.blocked"])).toBeInTheDocument();
    });
    // Each blocker is listed by the field that needs filling.
    expect(await screen.findByText(rw["products.missing.name_rw"])).toBeInTheDocument();
    expect(screen.getByText(rw["products.missing.photo"])).toBeInTheDocument();
  });
});

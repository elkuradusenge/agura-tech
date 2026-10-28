import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { App } from "../app/App";
import rw from "../lib/i18n/rw.json";

const PRODUCT = {
  id: "11111111-1111-1111-1111-111111111111",
  food_item_id: null,
  name_en: "Oyster mushroom",
  name_rw: "Ubunyobwa bw'igituba",
  photo_url: null,
  description_en: "Grows on agricultural waste.",
  description_rw: null,
  status: "trackable",
  version: 1,
  time_to_harvest_min_days: 21,
  time_to_harvest_max_days: 30,
  reviewer_name: "Dr Uwase",
  reviewer_organisation: "RAB",
  review_date: "2026-01-15",
  needs_expert_review: false,
  growing_steps_validated: true,
  published_at: "2026-01-16T00:00:00Z",
  created_at: "2026-01-16T00:00:00Z",
};

const USER = {
  id: "22222222-2222-2222-2222-222222222222",
  phone: "+250788111222",
  full_name: "Test Farmer",
  language: "rw",
  province: "Kigali City",
  district: "Nyarugenge",
  status: "active",
  phone_verified: true,
  data_saver: false,
  quiet_hours_start: "21:00:00",
  quiet_hours_end: "05:00:00",
  reminder_morning_time: "07:00:00",
  reminder_evening_time: "18:00:00",
  message_opt_in: false,
  created_at: "2026-01-16T00:00:00Z",
};

function jsonResponse(body: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } }),
  );
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("agura.access", "token");
  localStorage.setItem("agura.refresh", "refresh");
  localStorage.setItem("agura.account", "user");

  vi.stubGlobal(
    "fetch",
    vi.fn((input: string | URL) => {
      const url = String(input);
      if (url.includes("/me")) return jsonResponse(USER);
      if (url.includes("/products")) return jsonResponse({ items: [PRODUCT], pagination: { page: 1, page_size: 20, total: 1, total_pages: 1 } });
      if (url.includes("/notifications/unread-count")) return jsonResponse({ unread: 0 });
      return jsonResponse({ items: [], pagination: { page: 1, page_size: 20, total: 0, total_pages: 0 } });
    }),
  );
  // jsdom has no WebSocket. The farmer layout opens a socket, so give it a
  // silent stand-in that never connects, which is what an offline phone looks like.
  vi.stubGlobal(
    "WebSocket",
    class {
      static OPEN = 1;
      readyState = 0;
      onopen: (() => void) | null = null;
      onmessage: (() => void) | null = null;
      onclose: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(public url: string) {}
      send() {}
      close() {}
    },
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

describe("farmer app", () => {
  it("lists trackable products for a signed in farmer", async () => {
    render(
      <MemoryRouter initialEntries={["/app/products"]}>
        <App />
      </MemoryRouter>,
    );

    // The label appears in the nav and as the page heading.
    expect((await screen.findAllByText(rw["products.title"])).length).toBeGreaterThan(0);
    expect(await screen.findByText(PRODUCT.name_rw)).toBeInTheDocument();
  });

  it("keeps the farmer out of the admin console", async () => {
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <App />
      </MemoryRouter>,
    );

    // A farmer session is redirected to the administrator sign in screen.
    expect((await screen.findAllByText(rw["auth.adminSignIn"])).length).toBeGreaterThan(0);
  });
});

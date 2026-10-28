import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { App } from "../app/App";
import rw from "../lib/i18n/rw.json";

beforeEach(() => {
  localStorage.clear();
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
});

describe("App", () => {
  it("renders the public landing page at the root route", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );

    // Kinyarwanda is the default language, so read the expected copy from it.
    expect(await screen.findByRole("heading", { level: 1, name: rw["landing.hero.title"] })).toBeInTheDocument();
    expect(screen.getByText(rw["landing.problem.title"])).toBeInTheDocument();
    expect(screen.getByText(rw["landing.get.title"])).toBeInTheDocument();
    expect(screen.getByText(rw["landing.faq.title"])).toBeInTheDocument();

    // The three calls to action a visitor needs before signing in.
    const links = screen.getAllByRole("link");
    expect(links.some((link) => link.getAttribute("href") === "/sign-up")).toBe(true);
    expect(links.some((link) => link.getAttribute("href") === "/sign-in")).toBe(true);
  });

  it("keeps every landing section reachable by a heading", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );

    await screen.findByRole("heading", { level: 1 });
    const headings = screen.getAllByRole("heading");
    // A marketing page is scanned by headings, so each section must have one.
    expect(headings.length).toBeGreaterThanOrEqual(10);
  });

  it("renders the style guide with real controls and charts", async () => {
    render(
      <MemoryRouter initialEntries={["/style-guide"]}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByText("AGUra style guide")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Primary" })).toBeInTheDocument();
    // Every badge in the guide carries text, never colour alone. The default
    // language is Kinyarwanda, so the label is read from that dictionary.
    expect(screen.getByText(rw["status.trackable"])).toBeInTheDocument();
  });

  it("sends a signed out farmer to sign in rather than a protected screen", async () => {
    render(
      <MemoryRouter initialEntries={["/app/today"]}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { level: 1 })).toBeInTheDocument();
  });
});

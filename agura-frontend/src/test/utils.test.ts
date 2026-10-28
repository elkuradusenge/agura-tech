import { describe, expect, it } from "vitest";
import { formatDate, formatKigaliTime, formatNumber, formatPercent, todayIso } from "../lib/utils";

describe("formatPercent", () => {
  it("renders a share as one decimal percentage", () => {
    expect(formatPercent(0.0423)).toBe("4.2%");
  });

  it("renders a suppressed value as a dash rather than 0%", () => {
    expect(formatPercent(null)).toBe("-");
    expect(formatPercent(undefined)).toBe("-");
  });

  it("keeps a real zero as 0.0%", () => {
    expect(formatPercent(0)).toBe("0.0%");
  });
});

describe("formatNumber", () => {
  it("dashes a missing count", () => {
    expect(formatNumber(null)).toBe("-");
  });
});

describe("formatDate", () => {
  it("dashes an unparseable value", () => {
    expect(formatDate("not-a-date")).toBe("-");
    expect(formatDate(null)).toBe("-");
  });
});

describe("formatKigaliTime", () => {
  it("converts a UTC moment to Kigali wall clock", () => {
    expect(formatKigaliTime("2024-03-01T05:30:00Z")).toBe("07:30");
  });
});

describe("todayIso", () => {
  it("returns a plain ISO date", () => {
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

/** Small helpers shared by the components. */

import clsx from "clsx";
import type { ClassValue } from "clsx";

export function cn(...values: ClassValue[]): string {
  return clsx(values);
}

/** Percentages are shown to one decimal place, never as a raw float. */
export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined) return "-";
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat().format(value);
}

export function formatDate(value: string | null | undefined, language = "en"): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(language, { dateStyle: "medium" }).format(date);
}

export function formatDateTime(value: string | null | undefined, language = "en"): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(language, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function formatTime(value: string | null | undefined): string {
  if (!value) return "-";
  return value.slice(0, 5);
}

/** Kigali wall clock time for a due moment, which is what a farmer expects to see. */
export function formatKigaliTime(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Kigali",
  }).format(date);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

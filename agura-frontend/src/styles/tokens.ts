/**
 * Token access for the places that need a concrete colour value instead of a
 * CSS class, which in practice means the chart library.
 *
 * No colour is written here: the values are read from the custom properties in
 * tokens.css at render time, so light and dark mode both work and tokens.css
 * stays the single source of truth.
 */

export type TokenName =
  | "canvas"
  | "surface"
  | "surface-raised"
  | "line"
  | "line-strong"
  | "ink"
  | "ink-heading"
  | "ink-muted"
  | "primary"
  | "primary-text"
  | "primary-tint"
  | "success"
  | "warning"
  | "danger";

function read(property: string): string {
  if (typeof window === "undefined") return "currentColor";
  const value = getComputedStyle(document.documentElement).getPropertyValue(property).trim();
  // currentColor keeps a chart visible if a token is ever missing, instead of
  // rendering an invisible shape.
  return value || "currentColor";
}

export function token(name: TokenName): string {
  return read(`--${name}`);
}

/** The categorical series used by the charts, in order. */
export function chartPalette(count = 6): string[] {
  return Array.from({ length: count }, (_, index) => read(`--chart-${(index % 6) + 1}`));
}

export const chartGridColor = (): string => read("--line");
export const chartAxisColor = (): string => read("--ink-muted");

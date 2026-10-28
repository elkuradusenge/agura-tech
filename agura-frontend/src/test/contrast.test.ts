/**
 * Contrast guard. Reads the real values out of src/styles/tokens.css, so a token
 * change that breaks WCAG AA fails the build instead of shipping.
 *
 * AA thresholds: 4.5:1 for text, 3:1 for a focus ring and other non-text UI.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CSS = readFileSync(join(process.cwd(), "src/styles/tokens.css"), "utf8");

function block(selector: string): Record<string, string> {
  const start = CSS.indexOf(selector);
  const end = CSS.indexOf("}", start);
  const body = CSS.slice(start, end);
  const tokens: Record<string, string> = {};
  for (const match of body.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    tokens[match[1]] = match[2].trim();
  }
  return tokens;
}

const light = block(":root {");
const darkBlock = block(".dark {");

function resolve(name: string, tokens: Record<string, string>): string {
  let value = tokens[name] ?? light[name] ?? "";
  const alias = value.match(/^var\(--([\w-]+)\)$/);
  if (alias) value = resolve(alias[1], tokens);
  return value;
}

function parse(value: string): [number, number, number] {
  const hex = value.replace("#", "");
  const full =
    hex.length === 3
      ? hex
          .split("")
          .map((char) => char + char)
          .join("")
      : hex;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(value: string): number {
  const [r, g, b] = parse(value);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function ratio(foreground: string, background: string): number {
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const TEXT_PAIRS: Array<[string, string, string]> = [
  ["ink on canvas", "ink", "canvas"],
  ["ink on surface", "ink", "surface"],
  ["heading on surface", "ink-heading", "surface"],
  ["heading on canvas", "ink-heading", "canvas"],
  ["muted on surface", "ink-muted", "surface"],
  ["muted on canvas", "ink-muted", "canvas"],
  ["primary text on surface", "primary-text", "surface"],
  ["primary text on canvas", "primary-text", "canvas"],
  ["primary text on tint", "primary-text", "primary-tint"],
  ["ink on tint", "ink", "primary-tint"],
  ["on primary", "on-primary", "primary"],
  ["on primary hover", "on-primary", "primary-hover"],
  ["success on surface", "success", "surface"],
  ["warning on surface", "warning", "surface"],
  ["danger on surface", "danger", "surface"],
  ["ink on raised", "ink", "surface-raised"],
  // Status fills carry `text-canvas`, which flips with the theme.
  ["canvas text on danger fill", "canvas", "danger"],
  ["canvas text on warning fill", "canvas", "warning"],
  ["canvas text on success fill", "canvas", "success"],
];

describe.each([
  ["light", light],
  ["dark", { ...light, ...darkBlock }],
])("%s theme", (_name, tokens) => {
  it.each(TEXT_PAIRS)("%s meets AA for text", (_label, foreground, background) => {
    const value = ratio(resolve(foreground, tokens), resolve(background, tokens));
    expect(value).toBeGreaterThanOrEqual(4.5);
  });

  it("focus ring is visible against both grounds", () => {
    const ring = resolve("primary-text", tokens);
    expect(ratio(ring, resolve("canvas", tokens))).toBeGreaterThanOrEqual(3);
    expect(ratio(ring, resolve("surface", tokens))).toBeGreaterThanOrEqual(3);
  });
});

describe("palette", () => {
  it("uses the three brand colours exactly as specified", () => {
    expect(light["brand-primary"]).toBe("#3c7a89");
    expect(light["brand-secondary"]).toBe("#2e4756");
    expect(light["brand-deep"]).toBe("#16262e");
  });

  it("dark mode canvas and raised surface are the brand deep and secondary", () => {
    const dark = { ...light, ...darkBlock };
    expect(resolve("canvas", dark)).toBe("#16262e");
    expect(resolve("surface", dark)).toBe("#2e4756");
  });
});

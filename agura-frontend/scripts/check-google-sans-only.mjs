#!/usr/bin/env node
/**
 * Google Sans is the typeface, with Google Sans Flex and then the system stack as
 * fallbacks. No other family may be named, and the Tailwind stack must start with
 * Google Sans so a stray font-family cannot slip in unnoticed.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const ALLOWED = ["Google Sans", "Google Sans Flex", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif", "inherit", "monospace"];
const offenders = [];

function checkFile(path) {
  if (![".ts", ".tsx", ".css", ".html", ".js"].includes(extname(path))) return;
  const source = readFileSync(path, "utf8");
  for (const match of source.matchAll(/font-family\s*:\s*([^;]+);/g)) {
    const value = match[1];
    // var() and theme() both resolve to the Tailwind stack defined in the config.
    if (value.includes("var(") || value.includes("theme(")) continue;
    const families = value
      .split(",")
      .map((part) => part.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
    for (const family of families) {
      if (!ALLOWED.includes(family)) {
        offenders.push(`${path.replace(ROOT, "")}: ${family}`);
      }
    }
  }
}

function scan(target) {
  if (!statSync(target).isDirectory()) {
    checkFile(target);
    return;
  }
  for (const entry of readdirSync(target)) {
    if (["node_modules", "dist", ".git"].includes(entry)) continue;
    scan(join(target, entry));
  }
}

scan(join(ROOT, "src"));
scan(join(ROOT, "index.html"));

const config = readFileSync(join(ROOT, "tailwind.config.js"), "utf8");
if (!/sans:\s*\[\s*\n?\s*'"Google Sans"'/.test(config)) {
  offenders.push("tailwind.config.js: the sans stack must start with Google Sans");
}
if (/Syne/i.test(config)) {
  offenders.push("tailwind.config.js: Syne must not appear anywhere");
}

for (const path of ["src/styles/index.css", "src/styles/tokens.css"]) {
  if (/Syne/i.test(readFileSync(join(ROOT, path), "utf8"))) {
    offenders.push(`${path}: Syne must not appear anywhere`);
  }
}

// Syne must be gone from the whole app, not just the places we thought of.
for (const path of ["index.html", "src/main.tsx"]) {
  if (/Syne/i.test(readFileSync(join(ROOT, path), "utf8"))) {
    offenders.push(`${path}: Syne must not appear anywhere`);
  }
}

if (offenders.length) {
  console.error("Only Google Sans may be used as a typeface:");
  for (const offender of offenders) console.error(`  ${offender}`);
  process.exit(1);
}

console.log("Typeface is Google Sans only.");

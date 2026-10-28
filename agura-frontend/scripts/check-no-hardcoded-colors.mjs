#!/usr/bin/env node
/**
 * Colour values live in src/styles/tokens.css and nowhere else.
 *
 * Components, screens and the Tailwind config must reference the semantic tokens
 * (bg-surface, text-ink-heading, var(--primary), ...) so a theme change is a
 * single-file edit and dark mode cannot drift. index.html is exempt for the two
 * theme-color meta tags, which cannot read a CSS custom property.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const ALLOWED_FILES = new Set(["src/styles/tokens.css"]);
/* Tests are allowed to name an expected value: that is how the brand palette is
   pinned and how the contrast suite asserts against real tokens. */
const ALLOWED_PATHS = ["src/test/"];
const PATTERNS = [
  /#[0-9a-fA-F]{3,8}\b/g, // hex
  /\brgba?\s*\(\s*\d/g, // rgb() / rgba()
  /\bhsla?\s*\(\s*\d/g, // hsl() / hsla()
];

const offenders = [];

function checkFile(path) {
  const relative = path.replace(ROOT, "");
  if (ALLOWED_FILES.has(relative)) return;
  if (ALLOWED_PATHS.some((prefix) => relative.startsWith(prefix))) return;
  if (![".ts", ".tsx", ".js", ".css"].includes(extname(path))) return;

  const lines = readFileSync(path, "utf8").split("\n");
  lines.forEach((line, index) => {
    // Allow commented-out examples and the token file reference in a comment.
    if (/^\s*(\*|\/\/|\/\*)/.test(line)) return;
    for (const pattern of PATTERNS) {
      const found = line.match(pattern);
      if (found) offenders.push(`${relative}:${index + 1}  ${found.join(", ")}`);
    }
  });
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
checkFile(join(ROOT, "tailwind.config.js"));

if (offenders.length) {
  console.error("Colour values belong in src/styles/tokens.css. Use the semantic tokens:");
  for (const offender of offenders) console.error(`  ${offender}`);
  process.exit(1);
}

console.log("No hard coded colours outside tokens.css.");

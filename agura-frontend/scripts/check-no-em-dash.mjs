#!/usr/bin/env node
/**
 * Fail the build if an em dash appears in source, copy or i18n files.
 * The house style bans it so that text stays readable in SMS and on screen readers.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".json", ".css", ".html", ".md"]);
const SKIP = new Set(["node_modules", "dist", ".git", "coverage"]);

const offenders = [];

function walk(directory) {
  for (const entry of readdirSync(directory)) {
    if (SKIP.has(entry)) continue;
    const path = join(directory, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      walk(path);
    } else if (EXTENSIONS.has(extname(entry))) {
      const lines = readFileSync(path, "utf8").split("\n");
      lines.forEach((line, index) => {
        if (line.includes("\u2014")) offenders.push(`${path.replace(ROOT, "")}:${index + 1}`);
      });
    }
  }
}

walk(join(ROOT, "src"));
walk(join(ROOT, "scripts"));
walk(join(ROOT, "public"));

for (const name of ["SETUP.md", "index.html", "tailwind.config.js", "vite.config.ts"]) {
  const path = join(ROOT, name);
  if (!existsSync(path)) continue;
  readFileSync(path, "utf8")
    .split("\n")
    .forEach((line, index) => {
      if (line.includes("\u2014")) offenders.push(`${name}:${index + 1}`);
    });
}

if (offenders.length) {
  console.error("Em dash found. Use a comma, a full stop or a colon instead:");
  for (const offender of offenders) console.error(`  ${offender}`);
  process.exit(1);
}

console.log("No em dash found.");

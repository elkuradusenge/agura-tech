#!/usr/bin/env node
/**
 * Only Lucide icons may be imported. This keeps stroke weight, sizing and
 * accessibility behaviour consistent, and avoids shipping a second icon font.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SRC = join(ROOT, "src");
const ALLOWED = "lucide-react";
const offenders = [];

function walk(directory) {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      walk(path);
      continue;
    }
    if (![".ts", ".tsx"].includes(extname(entry))) continue;
    const source = readFileSync(path, "utf8");
    for (const match of source.matchAll(/from\s+"([^"]+)"/g)) {
      const specifier = match[1];
      const looksLikeIcon =
        /icon|fontawesome|heroicons|material-icons|feather|bootstrap-icons/i.test(specifier) ||
        /\.svg$/.test(specifier);
      if (looksLikeIcon && specifier !== ALLOWED) {
        offenders.push(`${path.replace(ROOT, "")} imports ${specifier}`);
      }
    }
  }
}

walk(SRC);

if (offenders.length) {
  console.error(`Icons must come from ${ALLOWED} only:`);
  for (const offender of offenders) console.error(`  ${offender}`);
  process.exit(1);
}

console.log("Icons are Lucide only.");

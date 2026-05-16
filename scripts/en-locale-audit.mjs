#!/usr/bin/env node
/**
 * Lists app/[locale] page routes for ko/en parity check.
 * Run: node scripts/en-locale-audit.mjs
 */
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "app/[locale]");

function walk(dir, base = "") {
  const out = [];
  for (const name of readdirSync(dir)) {
    const rel = base ? `${base}/${name}` : name;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name.startsWith("(") || name === "admin") continue;
      out.push(...walk(full, rel));
    } else if (name === "page.tsx") {
      out.push(`/${rel.replace(/\/page\.tsx$/, "").replace(/\/page$/, "") || ""}`);
    }
  }
  return out;
}

const routes = walk(root).sort();
console.log(`Public locale routes (${routes.length}):`);
for (const r of routes) {
  console.log(`  /ko${r}  ↔  /en${r}`);
}

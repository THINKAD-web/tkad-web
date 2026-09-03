#!/usr/bin/env node
/**
 * PR5-c — verify no client-boundary file value-imports server-only digital modules.
 * Run: node scripts/pr5-c-client-server-bundle-grep.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SERVER_ONLY = [
  "@/lib/planner/digital-catalog-bridge",
  "@/lib/digital/resolve-digital-catalog",
  "@/lib/digital/local-catalog-fetch",
  "@/lib/digital/resolve-digital-mix",
];

const CLIENT_MARKERS = ['"use client"', "'use client'"];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name === "dist") continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(tsx|ts|jsx|js)$/.test(name)) out.push(p);
  }
  return out;
}

const violations = [];
for (const file of walk(ROOT)) {
  const src = readFileSync(file, "utf8");
  if (!CLIENT_MARKERS.some((m) => src.includes(m))) continue;
  for (const mod of SERVER_ONLY) {
    const valueImport = new RegExp(
      `import\\s+(?!type\\s)[^;\\n]*from\\s+["']${mod.replace(/\//g, "\\/")}["']`,
    );
    if (valueImport.test(src)) {
      violations.push({ file: relative(ROOT, file), mod });
    }
  }
}

if (violations.length > 0) {
  console.error("[FAIL] client → server-only import violations:");
  for (const v of violations) console.error(`  ${v.file} → ${v.mod}`);
  process.exit(1);
}

console.log(
  JSON.stringify({ pass: true, checkedModules: SERVER_ONLY.length, clientFilesScanned: "all" }),
);

#!/usr/bin/env node
/**
 * STEP 1 — planner/brief 타이포 임의값 → tkad-type-* 흡수 (쓰는 화면, 밀도 유지).
 * node scripts/apply-planner-brief-typography.mjs [--check]
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const BRIEF_DIR = path.join(ROOT, "components/planner/brief");
const PLANNER_PAGE = path.join(ROOT, "app/[locale]/(site)/planner/page.tsx");

const REPLACEMENTS = [
  [/text-\[11px\]/g, "tkad-type-caption"],
  [/text-\[10px\]/g, "tkad-type-note"],
  [/text-\[12px\]/g, "tkad-type-meta"],
  [/text-sm font-semibold/g, "tkad-type-title"],
  [/text-xs font-semibold/g, "tkad-type-title"],
];

const ARBITRARY_RE =
  /text-\[(10|11|12|13|14|15|16|17|18|19|20)px\]|text-\[length:var\(--qp-text-/g;

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (ent.name.endsWith(".tsx")) out.push(p);
  }
  return out;
}

function countArbitrary(src) {
  const m = src.match(new RegExp(ARBITRARY_RE.source, "g"));
  return m?.length ?? 0;
}

const files = [...walk(BRIEF_DIR), PLANNER_PAGE].filter((f) =>
  fs.existsSync(f),
);

let totalBefore = 0;
let totalAfter = 0;
let changed = 0;

for (const file of files) {
  const src = fs.readFileSync(file, "utf8");
  totalBefore += countArbitrary(src);
  let next = src;
  for (const [re, rep] of REPLACEMENTS) {
    next = next.replace(re, rep);
  }
  totalAfter += countArbitrary(next);
  if (next !== src) {
    if (!process.argv.includes("--check")) {
      fs.writeFileSync(file, next);
      console.log("updated:", path.relative(ROOT, file));
    }
    changed++;
  }
}

console.log(
  JSON.stringify(
    {
      files: files.length,
      changed,
      arbitraryBefore: totalBefore,
      arbitraryAfter: totalAfter,
      mode: process.argv.includes("--check") ? "check" : "apply",
    },
    null,
    2,
  ),
);

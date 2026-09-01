#!/usr/bin/env node
/**
 * STEP 4 — 전역 잔여 text-[Npx] → tkad-type-* (문서/PDF/export 제외).
 * node scripts/apply-typography-residual.mjs [--check] [--zone site|all]
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SCAN_DIRS = ["app", "components", "lib"];

const EXCLUDE_PATH =
  /\/document\/|\/brutalist\/|quote-pdf-preview|quote-formal-preview|quote-premium|proposal-pdf-content|planner-report-export\/build-|\/planner\/brief\//;

const REPLACEMENTS = [
  [/sm:!text-\[11px\]/g, "sm:!tkad-type-caption"],
  [/!text-\[11px\]/g, "!tkad-type-caption"],
  [/sm:!text-\[10px\]/g, "sm:!tkad-type-note"],
  [/!text-\[10px\]/g, "!tkad-type-note"],
  [/sm:text-\[13px\]/g, "sm:tkad-type-body"],
  [/sm:text-\[12px\]/g, "sm:tkad-type-meta"],
  [/sm:text-\[11px\]/g, "sm:tkad-type-caption"],
  [/sm:text-\[10px\]/g, "sm:tkad-type-note"],
  [/text-\[15px\]/g, "text-base"],
  [/text-\[14px\]/g, "text-sm"],
  [/text-\[12\.5px\]/g, "tkad-type-body"],
  [/text-\[11px\]/g, "tkad-type-caption"],
  [/text-\[10px\]/g, "tkad-type-note"],
  [/text-\[12px\]/g, "tkad-type-meta"],
  [/text-\[13px\]/g, "tkad-type-body"],
  [/text-\[9px\]/g, "tkad-type-note"],
  [/text-\[8px\]/g, "tkad-type-note"],
  [
    /font-display text-xs font-medium uppercase tracking-\[[^\]]+\]/g,
    "tkad-type-label",
  ],
  [
    /font-display text-xs font-semibold uppercase tracking-\[[^\]]+\]/g,
    "tkad-type-label",
  ],
  [/font-display text-xs font-medium uppercase tracking-wider/g, "tkad-type-label"],
  [/font-display text-xs font-medium uppercase tracking-wide/g, "tkad-type-label"],
  [/text-sm font-semibold/g, "tkad-type-title"],
  [/text-xs font-semibold/g, "tkad-type-title"],
];

const ARBITRARY_RE =
  /(?:!?sm:)?!?text-\[(8|9|10|11|12|12\.5|13|14|15|16|17|18|19|20)px\]/g;

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === ".next") continue;
      walk(p, out);
    } else if (/\.(tsx|ts|jsx|js)$/.test(ent.name)) out.push(p);
  }
  return out;
}

function countArbitrary(src) {
  return src.match(ARBITRARY_RE)?.length ?? 0;
}

function includeFile(rel) {
  if (EXCLUDE_PATH.test(rel)) return false;
  const zone = process.argv.includes("--zone")
    ? process.argv[process.argv.indexOf("--zone") + 1]
    : "all";
  if (zone === "site") {
    return rel.includes("/(site)/") && !rel.includes("/admin/");
  }
  return true;
}

const files = SCAN_DIRS.flatMap((d) => walk(path.join(ROOT, d))).filter((f) =>
  includeFile(path.relative(ROOT, f)),
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

if (process.argv.includes("--check") && totalAfter > 0) {
  process.exit(1);
}

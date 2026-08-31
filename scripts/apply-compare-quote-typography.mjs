#!/usr/bin/env node
/**
 * STEP 3 — compare / quote UI 타이포 임의값 → tkad-type-* (쓰는 화면, 밀도·가격 계층 유지).
 * node scripts/apply-compare-quote-typography.mjs [--check]
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const COMPARE_DIR = path.join(ROOT, "components/compare");
const FILES = [
  "components/compare-bar.tsx",
  "components/compare-spec-table.tsx",
  "components/compare-page-client.tsx",
  "components/compare-pdf-quote.tsx",
  "components/quote/quote-preview-view.tsx",
  "components/quote/quote-status-timeline.tsx",
  "components/quote/quote-revision-request-panel.tsx",
  "components/quote/quote-contract-cta.tsx",
  "components/quote/quote-media-quantity-fields.tsx",
  "components/quote/quote-media-select-card.tsx",
  "components/media-quote-cta.tsx",
  "app/[locale]/(site)/quote/quote-page-client.tsx",
  "app/[locale]/(site)/quote/[id]/status/quote-status-client.tsx",
  "app/[locale]/(site)/quote/[id]/contract/contract-sign-client.tsx",
].map((f) => path.join(ROOT, f));

const REPLACEMENTS = [
  [/sm:!text-\[11px\]/g, "sm:!tkad-type-caption"],
  [/!text-\[11px\]/g, "!tkad-type-caption"],
  [/sm:text-\[13px\]/g, "sm:tkad-type-body"],
  [/sm:text-\[12px\]/g, "sm:tkad-type-meta"],
  [/sm:text-\[11px\]/g, "sm:tkad-type-caption"],
  [/sm:text-\[10px\]/g, "sm:tkad-type-note"],
  [/text-\[15px\]/g, "text-base"],
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
];

const ARBITRARY_RE =
  /!?sm:?!?text-\[(8|9|10|11|12|12\.5|13|14|15|16|17|18|19|20)px\]/g;

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (ent.name.endsWith(".tsx")) out.push(p);
  }
  return out;
}

function countArbitrary(src) {
  const m = src.match(ARBITRARY_RE);
  return m?.length ?? 0;
}

const files = [...walk(COMPARE_DIR), ...FILES.filter((f) => fs.existsSync(f))];

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
  console.error(
    `FAIL: ${totalAfter} arbitrary text-[Npx] remain in compare/quote scope`,
  );
  process.exit(1);
}

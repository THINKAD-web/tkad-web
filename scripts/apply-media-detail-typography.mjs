#!/usr/bin/env node
/**
 * STEP 2 — media detail 타이포 임의값 → tkad-type-* 흡수 (쓰는 화면, 밀도·가격 계층 유지).
 * node scripts/apply-media-detail-typography.mjs [--check]
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const MEDIA_DETAIL_DIR = path.join(ROOT, "components/media-detail");
const ROOT_FILES = [
  "components/media-detail-performance.tsx",
  "components/media-detail-quote-modal.tsx",
  "components/media-detail-extras.tsx",
  "components/media-detail-premium-points.tsx",
].map((f) => path.join(ROOT, f));

const REPLACEMENTS = [
  [/!text-\[11px\]/g, "!tkad-type-caption"],
  [/text-\[11px\]/g, "tkad-type-caption"],
  [/!text-\[10px\]/g, "!tkad-type-note"],
  [/text-\[10px\]/g, "tkad-type-note"],
  [/text-\[12px\]/g, "tkad-type-meta"],
  [/text-\[13px\]/g, "tkad-type-body"],
  [/text-\[12\.5px\]/g, "tkad-type-body"],
  [/text-\[9px\]/g, "tkad-type-note"],
  [/text-\[8px\]/g, "tkad-type-note"],
  [
    /font-display text-xs font-medium uppercase tracking-\[[^\]]+\]/g,
    "tkad-type-label",
  ],
  [
    /font-display text-\[10px\] font-black uppercase tracking-\[[^\]]+\]/g,
    "tkad-type-label",
  ],
];

const ARBITRARY_RE =
  /!?text-\[(8|9|10|11|12|12\.5|13|14|15|16|17|18|19|20)px\]/g;

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

const files = [
  ...walk(MEDIA_DETAIL_DIR),
  ...ROOT_FILES.filter((f) => fs.existsSync(f)),
];

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
  console.error(`FAIL: ${totalAfter} arbitrary text-[Npx] remain in media detail scope`);
  process.exit(1);
}

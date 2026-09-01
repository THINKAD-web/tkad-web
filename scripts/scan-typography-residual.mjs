#!/usr/bin/env node
/**
 * STEP 4 — 전역 text-[Npx] 잔여 스캔 리포트.
 * node scripts/scan-typography-residual.mjs [--json reports/typography-residual-scan.json]
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SCAN_DIRS = ["app", "components", "lib"];
const MATCH =
  /(?:!?sm:)?!?text-\[(8|9|10|11|12|12\.5|13|14|15|16|17|18|19|20)px\]/g;

const ZONES = [
  { id: "document", test: (p) => p.includes("/document/") },
  { id: "pdf-export", test: (p) =>
      /quote-pdf-preview|quote-formal-preview|quote-premium|proposal-pdf-content|planner-report-export|build-pdf|build-pptx/.test(p),
  },
  { id: "admin", test: (p) => p.includes("/admin/") || p.includes("/admin-") },
  { id: "planner-brief", test: (p) => p.includes("/planner/brief/") },
  { id: "media-detail", test: (p) =>
      p.includes("/media-detail") || p.includes("media-detail-"),
  },
  { id: "compare-quote", test: (p) =>
      p.includes("/compare") || p.includes("/quote/") || p.includes("quote-page"),
  },
  { id: "brutalist", test: (p) => p.includes("/brutalist/") },
  { id: "site-public", test: (p) => p.includes("/(site)/") },
  { id: "other", test: () => true },
];

function zoneOf(rel) {
  for (const z of ZONES) {
    if (z.id === "other") continue;
    if (z.test(rel)) return z.id;
  }
  return "other";
}

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

const files = SCAN_DIRS.flatMap((d) => walk(path.join(ROOT, d)));
const byFile = {};
const byZone = {};
let total = 0;

for (const file of files) {
  const rel = path.relative(ROOT, file);
  const src = fs.readFileSync(file, "utf8");
  const hits = src.match(MATCH);
  if (!hits?.length) continue;
  byFile[rel] = hits.length;
  total += hits.length;
  const zone = zoneOf(rel);
  byZone[zone] = (byZone[zone] ?? 0) + hits.length;
}

const topFiles = Object.entries(byFile)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 30)
  .map(([file, count]) => ({ file, count }));

const report = {
  scannedAt: new Date().toISOString(),
  total,
  fileCount: Object.keys(byFile).length,
  byZone,
  topFiles,
};

const outArg = process.argv.indexOf("--json");
if (outArg !== -1 && process.argv[outArg + 1]) {
  const outPath = path.resolve(ROOT, process.argv[outArg + 1]);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log("wrote", outPath);
}

console.log(JSON.stringify(report, null, 2));

#!/usr/bin/env node
/**
 * A1b/A1c — 자동 매핑하지 않는 period 값 리포트 (읽기 전용).
 * Usage: node --import tsx scripts/report-a1b-a1c-periods.mjs [catalog.json]
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { collectNonA1aPricePeriods } from "../lib/media-price-period-read.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, ".audit-price-period-risky-80");
const catalogPath =
  process.argv[2] ?? process.env.CATALOG_JSON ?? "/tmp/catalog-period-audit.json";

const raw = readFileSync(catalogPath, "utf8");
const data = JSON.parse(raw);
const items = Array.isArray(data) ? data : data.items ?? data.data ?? [];

const rows = collectNonA1aPricePeriods(items);
const byPeriod = new Map();
for (const r of rows) {
  byPeriod.set(r.period, (byPeriod.get(r.period) ?? 0) + 1);
}

const summary = {
  generatedAt: new Date().toISOString(),
  catalogPath,
  catalogSize: items.length,
  nonA1aRowCount: rows.length,
  uniquePeriods: [...byPeriod.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([period, count]) => ({ period, count })),
  rows,
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(
  path.join(OUT_DIR, "a1b-a1c-period-report.json"),
  JSON.stringify(summary, null, 2),
);

console.log(
  JSON.stringify(
    {
      out: path.join(OUT_DIR, "a1b-a1c-period-report.json"),
      nonA1aRowCount: rows.length,
      topPeriods: summary.uniquePeriods.slice(0, 10),
    },
    null,
    2,
  ),
);

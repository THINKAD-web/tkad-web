/**
 * 서울 벤치마크 CPM SSOT 전후 — 케이팝 등 샘플 reference CPM.
 *
 *   npx tsx scripts/diff-seoul-benchmark-cpm-sample.mts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { catalogPriceFieldToWon } from "../lib/media-price-format.ts";
import { resolveCpmWonForDisplayFromMediaItem } from "../lib/media-metrics.ts";
import { catalogMonthlyReferenceCpm } from "../lib/planner/seoul-media-benchmark.ts";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");

const kpop = {
  id: "kpop-sample",
  name: "코엑스 케이팝 스퀘어",
  region: "seoul",
  regionMain: "seoul",
  type: "digital",
  price: 100_000_000,
  pricePeriod: "month",
  priceOptions: [
    { label: "1구좌", price: 100_000_000, period: "month" },
    { label: "0.5구좌", price: 80_000_000, period: "month" },
  ],
  impressions: 4_500_000,
  dailyFootTraffic: 150_000,
  cpm: 22_222,
  computedMetric: { dailyImpressions: 150_000, modelVersion: "v0-fallback" },
} as const;

const legacyFootCpm = Math.round(
  (catalogPriceFieldToWon(kpop.price) / (150_000 * 30)) * 1000,
);

const display = resolveCpmWonForDisplayFromMediaItem(kpop as never);
const ref = catalogMonthlyReferenceCpm(kpop as never);

const report = {
  generatedAt: new Date().toISOString(),
  sample: "kpop-like",
  legacyRootPriceOverFootTimes30: legacyFootCpm,
  displayCpmSsot: display,
  catalogMonthlyReferenceCpm: ref?.cpm ?? null,
  note: "벤치마크 집계는 catalogMonthlyReferenceCpm → display SSOT",
};

const out = resolve(root, "reports/seoul-benchmark-cpm-ssot-sample.json");
mkdirSync(resolve(out, ".."), { recursive: true });
writeFileSync(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

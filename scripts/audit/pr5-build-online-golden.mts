#!/usr/bin/env npx tsx
/**
 * PR5-a — build online budget golden snapshot (14 calculable × 3 scenarios).
 *
 * Usage: npx tsx scripts/audit/pr5-build-online-golden.mts
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { calculateQuote } from "../../lib/quote-calculator.ts";
import { hasOnlinePricingSpec } from "../../lib/pricing/online-performance-estimate.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seedPath = join(root, "prisma/seed-data/online-media-2026-09.json");
const outPath = join(root, "lib/pricing/__tests__/golden/pr5-online-budget-snapshot.json");

type SeedRow = {
  slug: string;
  id: string;
  name: string;
  location: string;
  onlineSpec: {
    platform: string;
    minBudget: number;
    cpcMin: number | null;
    cpcMax: number | null;
    cpmMin: number | null;
    cpmMax: number | null;
  };
};

const seed = JSON.parse(readFileSync(seedPath, "utf8")) as { rows: SeedRow[] };
const calculable = seed.rows.filter((r) => hasOnlinePricingSpec(r.onlineSpec));

const LARGE_BUDGET = 10_000_000;
const startDate = "2025-06-01T12:00:00.000Z";
const endDate = "2025-06-30T12:00:00.000Z";

const scenarios = [
  { name: "at_min", budgetFor: (min: number) => min },
  { name: "2x_min", budgetFor: (min: number) => min * 2 },
  { name: "large", budgetFor: () => LARGE_BUDGET },
] as const;

const media = calculable.map((r) => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  location: r.location,
  type: null,
  catalogChannel: "online",
  price: 0,
  onlineSpec: {
    platform: r.onlineSpec.platform,
    minBudget: r.onlineSpec.minBudget,
    cpcMin: r.onlineSpec.cpcMin,
    cpcMax: r.onlineSpec.cpcMax,
    cpmMin: r.onlineSpec.cpmMin,
    cpmMax: r.onlineSpec.cpmMax,
  },
}));

const expected: Array<{
  slug: string;
  mediaId: string;
  scenario: string;
  budgetWon: number;
  totalWon: number;
  lineSupplyWon: number;
  impressions: number;
}> = [];

for (const row of calculable) {
  const min = row.onlineSpec.minBudget;
  for (const scenario of scenarios) {
    const budgetWon = scenario.budgetFor(min);
    const q = calculateQuote({
      media: [
        {
          id: row.id,
          name: row.name,
          location: row.location,
          type: null,
          catalogChannel: "online",
          price: 0,
          onlineSpec: row.onlineSpec,
        },
      ],
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      discountRate: 0,
      mediaSelections: [
        {
          mediaId: row.id,
          priceOptionIndex: 0,
          optionLabel: null,
          optionPriceWon: budgetWon,
          lineTotalWon: budgetWon,
        },
      ],
    });
    expected.push({
      slug: row.slug,
      mediaId: row.id,
      scenario: scenario.name,
      budgetWon,
      totalWon: q.totalWon,
      lineSupplyWon: q.lines[0]!.lineSupplyWon,
      impressions: q.lines[0]!.impressions,
    });
  }
}

const snapshot = {
  generatedAt: new Date().toISOString(),
  sampleCount: calculable.length,
  calcRows: expected.length,
  startDate,
  endDate,
  largeBudgetWon: LARGE_BUDGET,
  scenarios: scenarios.map((s) => s.name),
  media,
  expected,
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(snapshot, null, 2) + "\n");
console.log(`Wrote ${expected.length} rows (${calculable.length} slugs × ${scenarios.length}) → ${outPath}`);

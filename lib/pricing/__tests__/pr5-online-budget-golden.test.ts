import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { calculateQuote } from "@/lib/quote-calculator";
import type { QuoteCalculatorMediaWithOnline } from "@/lib/pricing/strategy-types";

const goldenPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "golden/pr5-online-budget-snapshot.json",
);

type GoldenSnapshot = {
  sampleCount: number;
  calcRows: number;
  startDate: string;
  endDate: string;
  media: QuoteCalculatorMediaWithOnline[];
  expected: Array<{
    slug: string;
    mediaId: string;
    scenario: string;
    budgetWon: number;
    totalWon: number;
    lineSupplyWon: number;
    impressions: number;
  }>;
};

function loadGolden(): GoldenSnapshot {
  return JSON.parse(readFileSync(goldenPath, "utf8")) as GoldenSnapshot;
}

test("PR5-a online golden — 14 calculable × 3 scenarios", () => {
  const golden = loadGolden();
  assert.equal(golden.sampleCount, 14);
  assert.equal(golden.calcRows, 42);
  assert.equal(golden.expected.length, 42);

  const mediaById = new Map(golden.media.map((m) => [m.id, m]));
  const startDate = new Date(golden.startDate);
  const endDate = new Date(golden.endDate);

  const mismatches: Array<Record<string, unknown>> = [];
  for (const exp of golden.expected) {
    const media = mediaById.get(exp.mediaId);
    assert.ok(media, `missing media fixture ${exp.mediaId}`);

    const q = calculateQuote({
      media: [media],
      startDate,
      endDate,
      discountRate: 0,
      mediaSelections: [
        {
          mediaId: exp.mediaId,
          priceOptionIndex: 0,
          optionLabel: null,
          optionPriceWon: exp.budgetWon,
          lineTotalWon: exp.budgetWon,
        },
      ],
    });

    if (q.totalWon !== exp.totalWon) {
      mismatches.push({
        slug: exp.slug,
        scenario: exp.scenario,
        field: "totalWon",
        expected: exp.totalWon,
        actual: q.totalWon,
      });
    }
    if (q.lines[0]?.lineSupplyWon !== exp.lineSupplyWon) {
      mismatches.push({
        slug: exp.slug,
        scenario: exp.scenario,
        field: "lineSupplyWon",
        expected: exp.lineSupplyWon,
        actual: q.lines[0]?.lineSupplyWon,
      });
    }
    if (q.lines[0]?.impressions !== exp.impressions) {
      mismatches.push({
        slug: exp.slug,
        scenario: exp.scenario,
        field: "impressions",
        expected: exp.impressions,
        actual: q.lines[0]?.impressions,
      });
    }
  }

  assert.deepEqual(mismatches, [], `golden mismatches: ${JSON.stringify(mismatches, null, 2)}`);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { calculateQuote } from "@/lib/quote-calculator";
import type { QuoteCalculatorMedia } from "@/lib/pricing/strategy-types";
import type { MediaPriceOption } from "@/lib/media-data";

const goldenPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "golden/pr2-quote-snapshot.json",
);

type GoldenSnapshot = {
  sampleCount: number;
  calcRows: number;
  startDate: string;
  endDate: string;
  scenarios: Array<{ name: string; periodKey?: string }>;
  media: QuoteCalculatorMedia[];
  expected: Array<{
    mediaId: string;
    scenario: string;
    totalWon: number;
    lineSupplyWon: number | null;
  }>;
};

function loadGolden(): GoldenSnapshot {
  return JSON.parse(readFileSync(goldenPath, "utf8")) as GoldenSnapshot;
}

function parseMediaFromGolden(raw: QuoteCalculatorMedia): QuoteCalculatorMedia {
  return {
    ...raw,
    priceOptions: raw.priceOptions as MediaPriceOption[] | null | undefined,
  };
}

test("PR2 golden snapshot — 34 samples × 3 scenarios, totalWon exact match", () => {
  const golden = loadGolden();
  assert.equal(golden.sampleCount, 34);
  assert.equal(golden.calcRows, 102);
  assert.equal(golden.expected.length, 102);

  const mediaById = new Map(
    golden.media.map((m) => [m.id, parseMediaFromGolden(m)]),
  );
  const startDate = new Date(golden.startDate);
  const endDate = new Date(golden.endDate);

  const mismatches: Array<Record<string, unknown>> = [];
  for (const exp of golden.expected) {
    const media = mediaById.get(exp.mediaId);
    assert.ok(media, `missing media fixture ${exp.mediaId}`);
    const scenario = golden.scenarios.find((s) => s.name === exp.scenario);
    assert.ok(scenario, `unknown scenario ${exp.scenario}`);

    const q = calculateQuote({
      media: [media],
      startDate,
      endDate,
      discountRate: 0,
      periodKey: scenario.periodKey,
      mediaPriceOptionIndex: {},
    });

    if (q.totalWon !== exp.totalWon) {
      mismatches.push({
        mediaId: exp.mediaId,
        scenario: exp.scenario,
        expectedTotalWon: exp.totalWon,
        actualTotalWon: q.totalWon,
      });
    }
    if (
      exp.lineSupplyWon != null &&
      q.lines[0]?.lineSupplyWon !== exp.lineSupplyWon
    ) {
      mismatches.push({
        mediaId: exp.mediaId,
        scenario: exp.scenario,
        field: "lineSupplyWon",
        expected: exp.lineSupplyWon,
        actual: q.lines[0]?.lineSupplyWon,
      });
    }
  }

  assert.deepEqual(mismatches, []);
});

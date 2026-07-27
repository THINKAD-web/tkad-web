import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mergeIntegratedKpis } from "@/lib/integrated/merge-kpis";
import type { DigitalMixResult } from "@/lib/integrated/schemas";

const digitalMix: DigitalMixResult = {
  input: {
    industry: "FNB",
    goal: "AWARENESS",
    budgetMonthly: 5_000_000,
    periodWeeks: 4,
  },
  generatedAt: new Date().toISOString(),
  channels: [],
  kpis: {
    impressionsMin: 1_000_000,
    impressionsMax: 1_200_000,
    clicksMin: 5_000,
    clicksMax: 6_000,
  },
};

describe("mergeIntegratedKpis", () => {
  it("applies synergy lift multiplier 2.3", () => {
    const merged = mergeIntegratedKpis({
      oohImpressions: 2_000_000,
      digitalMix,
    });
    assert.equal(merged.synergyLiftMultiplier, 2.3);
    assert.ok(merged.combinedKpis.totalImpressionsMin != null);
    assert.ok(merged.combinedKpis.totalImpressionsMax != null);
    assert.equal(merged.combinedKpis.totalClicksMin, 5_000);
    assert.equal(merged.combinedKpis.totalClicksMax, 6_000);
  });

  it("includes ko/en disclaimers", () => {
    const merged = mergeIntegratedKpis({ oohImpressions: 0, digitalMix });
    assert.match(merged.disclaimers.ko, /시너지/);
    assert.match(merged.disclaimers.en, /synergy/i);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mergeIntegratedKpis } from "@/lib/integrated/merge-kpis";
import type { DigitalMixResult } from "@/lib/integrated/schemas";

const digitalMix: DigitalMixResult = {
  input: {
    industry: "FNB",
    goal: "AWARENESS",
    budgetMonthly: 5_000_000,
    periodWeeks: 12,
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
  it("scales monthly digital KPIs to campaign period before synergy", () => {
    const merged = mergeIntegratedKpis({
      oohImpressions: 2_000_000,
      digitalMix,
    });
    const oohMin = Math.round(2_000_000 * 0.85);
    const dCampaignMin = 1_000_000 * 3;
    assert.equal(
      merged.combinedKpis.totalImpressionsMin,
      Math.round((oohMin + dCampaignMin) * 1.15),
    );
    assert.equal(merged.combinedKpis.totalClicksMin, 15_000);
    assert.equal(merged.combinedKpis.totalClicksMax, 18_000);
  });

  it("exposes synergyLiftMultiplier 2.3 without double-applying to digital leg", () => {
    const merged = mergeIntegratedKpis({
      oohImpressions: 2_000_000,
      digitalMix,
    });
    assert.equal(merged.synergyLiftMultiplier, 2.3);
  });

  it("includes ko/en disclaimers", () => {
    const merged = mergeIntegratedKpis({ oohImpressions: 0, digitalMix });
    assert.match(merged.disclaimers.ko, /시너지/);
    assert.match(merged.disclaimers.en, /synergy/i);
  });
});

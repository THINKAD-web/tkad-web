import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  aggregatePerformanceEstimates,
  totalBudgetWon,
} from "@/lib/admin-campaign-builder/aggregate-kpis";
import type { CampaignBuilderPayload } from "@/lib/admin-campaign-builder/schemas";
import { CAMPAIGN_BUILDER_PAYLOAD_VERSION } from "@/lib/admin-campaign-builder/schemas";

const pricedSpec = {
  minBudget: 500_000,
  cpcMin: 100,
  cpcMax: 500,
  cpmMin: 3_000,
  cpmMax: 8_000,
};

describe("aggregatePerformanceEstimates", () => {
  it("sums reach and click ranges across lines (min+min, max+max)", () => {
    const agg = aggregatePerformanceEstimates([
      { spec: pricedSpec, budgetWon: 1_000_000 },
      { spec: pricedSpec, budgetWon: 500_000 },
    ]);

    assert.equal(
      agg.reachMax,
      Math.floor((1_000_000 / 3_000) * 1000) +
        Math.floor((500_000 / 3_000) * 1000),
    );
    assert.equal(
      agg.reachMin,
      Math.floor((1_000_000 / 8_000) * 1000) +
        Math.floor((500_000 / 8_000) * 1000),
    );
    assert.equal(agg.clicksMax, Math.floor(1_000_000 / 100) + Math.floor(500_000 / 100));
    assert.equal(agg.clicksMin, Math.floor(1_000_000 / 500) + Math.floor(500_000 / 500));
  });

  it("returns null metrics when no calculable lines", () => {
    const agg = aggregatePerformanceEstimates([
      { spec: null, budgetWon: 1_000_000 },
    ]);
    assert.equal(agg.reachMin, null);
    assert.equal(agg.reachMax, null);
    assert.equal(agg.clicksMin, null);
    assert.equal(agg.clicksMax, null);
  });
});

describe("totalBudgetWon", () => {
  it("sums digital, ooh, and custom line budgets", () => {
    const payload: CampaignBuilderPayload = {
      version: CAMPAIGN_BUILDER_PAYLOAD_VERSION,
      mode: "digital",
      documentType: "proposal",
      title: "합계 테스트",
      digitalLines: [{ slug: "a", budgetWon: 1_000_000 }],
      oohLines: [{ mediaId: "m1", name: "OOH", priceWon: 2_000_000 }],
      customLines: [
        {
          id: "c1",
          mediaName: "Custom",
          budgetWon: 300_000,
        },
      ],
    };
    assert.equal(totalBudgetWon(payload), 3_300_000);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  diffChannelComposition,
  summarizeBuilderReport,
} from "@/lib/admin-campaign-builder/summary";
import type { CampaignBuilderPayload } from "@/lib/admin-campaign-builder/schemas";
import { CAMPAIGN_BUILDER_PAYLOAD_VERSION } from "@/lib/admin-campaign-builder/schemas";

const basePayload = (
  digitalLines: CampaignBuilderPayload["digitalLines"],
): CampaignBuilderPayload => ({
  version: CAMPAIGN_BUILDER_PAYLOAD_VERSION,
  mode: "digital",
  documentType: "proposal",
  title: "요약 테스트",
  digitalLines,
  oohLines: [],
  customLines: [],
});

describe("summarizeBuilderReport", () => {
  it("aggregates budget, line counts, and chart data", () => {
    const catalog = new Map([
      ["slug-a", { nameKo: "상품 A", platform: "Meta" }],
      ["slug-b", { nameKo: "상품 B", platform: "Naver" }],
    ]);
    const summary = summarizeBuilderReport(
      basePayload([
        { slug: "slug-a", budgetWon: 1_000_000 },
        { slug: "slug-b", budgetWon: 2_000_000 },
      ]),
      catalog,
    );

    assert.equal(summary.totalBudgetWon, 3_000_000);
    assert.equal(summary.lineCount, 2);
    assert.equal(summary.digitalLineCount, 2);
    assert.equal(summary.budgetChart.length, 2);
    assert.equal(summary.budgetChart[0]?.label, "상품 A");
  });
});

describe("diffChannelComposition", () => {
  it("returns PlannerExportChartDatum[] for budget deltas", () => {
    const a = basePayload([{ slug: "slug-a", budgetWon: 1_000_000 }]);
    const b = basePayload([
      { slug: "slug-a", budgetWon: 2_000_000 },
      { slug: "slug-b", budgetWon: 500_000 },
    ]);
    const chart = diffChannelComposition(a, b);
    assert.ok(chart.length >= 1);
    assert.equal(typeof chart[0]?.label, "string");
    assert.ok((chart[0]?.value ?? 0) > 0);
    assert.equal(chart[0]?.colorKey, "digital");
  });
});

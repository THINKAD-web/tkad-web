import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyInsightsOverride,
  buildCampaignBuilderInsights,
} from "@/lib/admin-campaign-builder/build-insights";
import type { CampaignBuilderPayload } from "@/lib/admin-campaign-builder/schemas";
import { CAMPAIGN_BUILDER_PAYLOAD_VERSION } from "@/lib/admin-campaign-builder/schemas";
import type { PublicMediaView } from "@/lib/digital/public-media-types";

const view: PublicMediaView = {
  slug: "ig-awareness-reach",
  nameKo: "인스타 도달",
  nameEn: "IG reach",
  channel: "online",
  objective: "awareness",
  mediaType: "social",
  platform: "Meta",
  billingType: ["cpm"],
  cpcMin: 100,
  cpcMax: 300,
  cpmMin: 3_000,
  cpmMax: 8_000,
  minBudget: 500_000,
  monthlyBudgetMin: 500_000,
  monthlyBudgetMax: 5_000_000,
  descriptionKo: "",
  descriptionEn: "",
  featuresKo: [],
  kpiHintsKo: [],
  fitIndustries: [],
  fitGoals: [],
  ageTargets: [],
  genderTarget: null,
  interests: [],
  geoTargeting: [],
  audienceSize: null,
  strengths: [],
  idealFor: [],
  verified: true,
  isPromotion: false,
  mediaKitUrl: null,
  logoUrl: null,
  sourceNote: null,
  sortOrder: 0,
};

const payload: CampaignBuilderPayload = {
  version: CAMPAIGN_BUILDER_PAYLOAD_VERSION,
  mode: "digital",
  documentType: "proposal",
  title: "인사이트 테스트",
  digitalLines: [{ slug: "ig-awareness-reach", budgetWon: 1_000_000 }],
  oohLines: [],
  customLines: [],
};

describe("buildCampaignBuilderInsights", () => {
  it("delegates to buildOnlineReportInsights", () => {
    const insights = buildCampaignBuilderInsights(payload, {
      views: [view],
      isKo: true,
    });
    assert.ok(insights.pacingPlan.length > 0);
    assert.ok(insights.creativeDirections.length > 0);
    assert.ok(insights.operationalNotes.length > 0);
    assert.ok(insights.disclaimer.length > 0);
  });
});

describe("applyInsightsOverride", () => {
  it("merges only override fields onto base", () => {
    const base = buildCampaignBuilderInsights(payload, { views: [view] });
    const merged = applyInsightsOverride(base, {
      creativeDirections: ["커스텀 카피"],
    });
    assert.deepEqual(merged.creativeDirections, ["커스텀 카피"]);
    assert.deepEqual(merged.pacingPlan, base.pacingPlan);
    assert.deepEqual(merged.operationalNotes, base.operationalNotes);
    assert.equal(merged.disclaimer, base.disclaimer);
  });

  it("overrides disclaimer when provided", () => {
    const base = buildCampaignBuilderInsights(payload, { views: [view] });
    const merged = applyInsightsOverride(base, {
      disclaimer: "커스텀 disclaimer",
    });
    assert.equal(merged.disclaimer, "커스텀 disclaimer");
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyKpiCardOverrides,
  buildBuilderKpiCards,
  buildBuilderKpiCardsBase,
} from "@/lib/admin-campaign-builder/build-kpi-cards";
import {
  CAMPAIGN_BUILDER_PAYLOAD_VERSION,
  type CampaignBuilderPayload,
} from "@/lib/admin-campaign-builder/schemas";
import { summarizeBuilderReport } from "@/lib/admin-campaign-builder/summary";
import type { PublicMediaView } from "@/lib/digital/public-media-types";

const view: PublicMediaView = {
  slug: "meta-kpi",
  nameKo: "메타 KPI",
  nameEn: "Meta KPI",
  channel: "online",
  objective: "awareness",
  mediaType: "digital",
  platform: "Meta",
  billingType: ["cpm"],
  cpcMin: 100,
  cpcMax: 200,
  cpmMin: 3000,
  cpmMax: 5000,
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

const proposalPayload: CampaignBuilderPayload = {
  version: CAMPAIGN_BUILDER_PAYLOAD_VERSION,
  mode: "digital",
  documentType: "proposal",
  title: "KPI proposal",
  digitalLines: [{ slug: "meta-kpi", budgetWon: 1_000_000 }],
  oohLines: [],
  customLines: [],
};

function summaryFor(payload: CampaignBuilderPayload) {
  const catalogBySlug = new Map([
    ["meta-kpi", { nameKo: view.nameKo, platform: view.platform }],
  ]);
  return summarizeBuilderReport(payload, catalogBySlug);
}

describe("buildBuilderKpiCardsBase proposal", () => {
  it("includes activeChannels, totalBudget, expectedReach, avgBudget when data allows", () => {
    const cards = buildBuilderKpiCardsBase(
      proposalPayload,
      summaryFor(proposalPayload),
      true,
    );
    assert.deepEqual(cards.map((c) => c.id), [
      "activeChannels",
      "totalBudget",
      "avgBudget",
    ]);
    assert.equal(cards.find((c) => c.id === "activeChannels")?.value, "1");
    assert.ok((cards.find((c) => c.id === "totalBudget")?.value.length ?? 0) > 0);
  });
});

describe("applyKpiCardOverrides", () => {
  it("replaces label only and keeps computed value", () => {
    const base = buildBuilderKpiCardsBase(
      proposalPayload,
      summaryFor(proposalPayload),
      true,
    );
    const merged = applyKpiCardOverrides(base, {
      kpiCards: [{ id: "totalBudget", labelOverride: "커스텀 총액" }],
    });
    const card = merged.find((k) => k.label === "커스텀 총액");
    assert.ok(card);
    assert.equal(card?.value, base.find((b) => b.id === "totalBudget")?.value);
  });

  it("hides a card by id", () => {
    const base = buildBuilderKpiCardsBase(
      proposalPayload,
      summaryFor(proposalPayload),
      true,
    );
    const merged = applyKpiCardOverrides(base, {
      kpiCards: [{ id: "totalBudget", hidden: true }],
    });
    assert.ok(!merged.some((k) => k.label.includes("총")));
    assert.equal(merged.length, base.length - 1);
  });

  it("returns empty when all cards hidden", () => {
    const base = buildBuilderKpiCardsBase(
      proposalPayload,
      summaryFor(proposalPayload),
      true,
    );
    const merged = applyKpiCardOverrides(base, {
      kpiCards: base.map((card) => ({ id: card.id, hidden: true })),
    });
    assert.deepEqual(merged, []);
  });

  it("keeps defaults when override absent", () => {
    const summary = summaryFor(proposalPayload);
    const withOverride = buildBuilderKpiCards(
      proposalPayload,
      summary,
      true,
    );
    const baseline = buildBuilderKpiCardsBase(proposalPayload, summary, true);
    assert.deepEqual(
      withOverride.map((k) => k.label),
      baseline.map((k) => k.label),
    );
  });
});

describe("buildBuilderKpiCards report", () => {
  it("uses report card ids when custom lines exist", () => {
    const reportPayload: CampaignBuilderPayload = {
      ...proposalPayload,
      documentType: "report",
      digitalLines: [],
      customLines: [
        {
          id: "c1",
          mediaName: "실측",
          budgetWon: 2_000_000,
          actualReach: 10_000,
          actualClicks: 200,
        },
      ],
    };
    const cards = buildBuilderKpiCards(
      reportPayload,
      summarizeBuilderReport(reportPayload),
      true,
    );
    const labels = cards.map((c) => c.label);
    assert.ok(labels.includes("집행 캠페인"));
    assert.ok(labels.includes("실측 도달 합산"));
  });
});

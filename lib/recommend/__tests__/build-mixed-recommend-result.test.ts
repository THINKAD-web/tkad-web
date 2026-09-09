import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { MediaItem, MediaOnlineSpecView } from "@/lib/media-data";
import type { MatchedMedia } from "@/lib/matching-engine";
import type { AiRecommendInput } from "@/lib/ai-media-recommend";
import { buildMixedRecommendResult } from "@/lib/recommend/build-mixed-recommend-result";

function onlineItem(
  id: string,
  platform: string,
  spec: Partial<MediaOnlineSpecView> = {},
): MediaItem {
  return {
    id,
    name: `${platform} ${id}`,
    nameEn: `${platform} ${id}`,
    location: "온라인",
    locationEn: "Online",
    region: "전국",
    type: "SNS",
    price: null,
    lat: 0,
    lng: 0,
    dailyFootTraffic: 0,
    sampleImages: [],
    catalogChannel: "online",
    onlineSpec: {
      platform,
      minBudget: 500_000,
      cpcMin: 200,
      cpcMax: 600,
      cpmMin: 4_000,
      cpmMax: 8_000,
      targetingOptions: [],
      strengths: [],
      kpiHints: [],
      bestFor: [],
      ...spec,
    },
  };
}

const MOCK_ONLINE_CATALOG: MediaItem[] = [
  onlineItem("ig-1", "인스타그램", {
    targetingOptions: ["goal:AWARENESS", "industry:ECOMMERCE", "age:18-24", "gender:ALL"],
    bestFor: ["신규 브랜드 런칭"],
  }),
  onlineItem("naver-1", "네이버 검색광고", {
    targetingOptions: ["goal:CONVERSION", "goal:LEAD", "industry:B2B", "age:35-44", "gender:ALL"],
    bestFor: ["전환 데이터가 있는 경우"],
    minBudget: 3_000_000,
  }),
];

const OOH_ONLY_CATALOG: MediaItem[] = [
  {
    id: "dooh-1",
    name: "강남 빌보드",
    nameEn: "Gangnam Billboard",
    location: "서울",
    locationEn: "Seoul",
    region: "seoul",
    type: "dooh",
    price: 500,
    lat: 0,
    lng: 0,
    dailyFootTraffic: 100_000,
    sampleImages: [],
    catalogChannel: "ooh",
  },
];

function stubMatched(id: string): MatchedMedia {
  const media = OOH_ONLY_CATALOG[0]!;
  return {
    media: { ...media, id },
    score: 80,
    breakdown: {},
    reasons: [{ ko: "test", en: "test" }],
  };
}

function baseAiInput(
  overrides: Partial<AiRecommendInput> = {},
): AiRecommendInput {
  return {
    goal: "launch",
    target: "genz",
    budgetMaxMan: 500,
    region: "seoul",
    industry: "retail",
    ...overrides,
  };
}

describe("buildMixedRecommendResult", () => {
  it("returns ok with online platforms when budget and catalog allow", async () => {
    const ooh = [stubMatched("dooh-1")];
    const result = await buildMixedRecommendResult({
      aiInput: baseAiInput(),
      oohRecommendations: ooh,
      catalog: [...OOH_ONLY_CATALOG, ...MOCK_ONLINE_CATALOG],
      isKo: true,
    });

    assert.equal(result.onlineStatus, "ok");
    assert.ok(result.online);
    assert.ok(result.online!.platforms.length > 0);
    assert.equal(result.oohRecommendations, ooh);
    assert.ok(result.allocation.digitalBudgetWon > 0);
    assert.ok(result.allocation.oohBudgetWon > 0);
  });

  it("returns digital_budget_zero when digital slice is 0", async () => {
    const result = await buildMixedRecommendResult({
      aiInput: baseAiInput({ budgetMaxMan: 500, digitalBudgetPct: 0 }),
      oohRecommendations: [stubMatched("dooh-1")],
      catalog: MOCK_ONLINE_CATALOG,
      isKo: true,
    });

    assert.equal(result.onlineStatus, "digital_budget_zero");
    assert.equal(result.online, null);
    assert.equal(result.allocation.digitalBudgetWon, 0);
  });

  it("returns no_online_catalog when catalog has no online rows", async () => {
    const result = await buildMixedRecommendResult({
      aiInput: baseAiInput(),
      oohRecommendations: [stubMatched("dooh-1")],
      catalog: OOH_ONLY_CATALOG,
      isKo: true,
    });

    assert.equal(result.onlineStatus, "no_online_catalog");
    assert.equal(result.online, null);
  });

  it("returns no_relevant_channels when scorer finds no match", async () => {
    const unmatchedCatalog = [
      onlineItem("only-naver", "네이버 검색광고", {
        targetingOptions: ["goal:CONVERSION", "industry:B2B", "age:35-44"],
        minBudget: 3_000_000,
      }),
    ];
    const result = await buildMixedRecommendResult({
      aiInput: baseAiInput({
        goal: "awareness",
        industry: "beauty",
        target: "genz",
      }),
      oohRecommendations: [stubMatched("dooh-1")],
      catalog: unmatchedCatalog,
      isKo: true,
    });

    assert.equal(result.onlineStatus, "no_relevant_channels");
    assert.equal(result.online, null);
  });

  it("returns budget_too_small when digital budget cannot cover min spend", async () => {
    const result = await buildMixedRecommendResult({
      aiInput: baseAiInput({
        budgetMaxMan: 10,
        digitalBudgetPct: 100,
        goal: "conversion",
        industry: "fintech",
        target: "mass",
      }),
      oohRecommendations: [stubMatched("dooh-1")],
      catalog: MOCK_ONLINE_CATALOG,
      isKo: true,
    });

    assert.equal(result.onlineStatus, "budget_too_small");
    assert.equal(result.online, null);
    assert.equal(result.allocation.digitalBudgetWon, 100_000);
  });

  it("passes through oohRecommendations without mutation", async () => {
    const ooh = [stubMatched("dooh-1"), stubMatched("dooh-2")];
    const result = await buildMixedRecommendResult({
      aiInput: baseAiInput({ digitalBudgetPct: 0 }),
      oohRecommendations: ooh,
      catalog: MOCK_ONLINE_CATALOG,
      isKo: true,
    });

    assert.equal(result.oohRecommendations, ooh);
    assert.equal(result.oohRecommendations.length, 2);
    assert.equal(result.oohRecommendations[0]!.score, 80);
  });
});

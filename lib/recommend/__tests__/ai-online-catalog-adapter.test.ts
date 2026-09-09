import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { MediaItem, MediaOnlineSpecView } from "@/lib/media-data";
import type { AiRecommendInput } from "@/lib/ai-media-recommend";
import {
  aiIndustryToBriefIndustry,
  aiRecommendToOnlineCatalogInput,
  aiTargetToBriefAgeBands,
} from "@/lib/recommend/ai-online-catalog-adapter";

function onlineItem(id: string): MediaItem {
  return {
    id,
    name: id,
    nameEn: id,
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
      platform: "테스트",
      minBudget: 500_000,
      targetingOptions: [],
      strengths: [],
      kpiHints: [],
      bestFor: [],
    } satisfies MediaOnlineSpecView,
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

describe("aiIndustryToBriefIndustry", () => {
  const cases: Array<[AiRecommendInput["industry"], string]> = [
    ["beauty", "retail"],
    ["retail", "retail"],
    ["fmcg", "retail"],
    ["fintech", "finance"],
    ["entertainment", "ent"],
    ["auto", "other"],
    ["other", "other"],
  ];

  for (const [industry, expected] of cases) {
    it(`maps ${industry} → ${expected}`, () => {
      assert.equal(aiIndustryToBriefIndustry(industry), expected);
    });
  }

  it("falls back to other for unknown industry values", () => {
    assert.equal(
      aiIndustryToBriefIndustry("unknown" as AiRecommendInput["industry"]),
      "other",
    );
  });
});

describe("aiTargetToBriefAgeBands", () => {
  it("maps all AI target values", () => {
    assert.deepEqual(aiTargetToBriefAgeBands("genz"), ["20s"]);
    assert.deepEqual(aiTargetToBriefAgeBands("millennial"), ["20s", "30s"]);
    assert.deepEqual(aiTargetToBriefAgeBands("family"), ["40s"]);
    assert.deepEqual(aiTargetToBriefAgeBands("biz"), ["30s", "40s"]);
    assert.deepEqual(aiTargetToBriefAgeBands("mass"), []);
  });

  it("falls back to [] for unknown target values", () => {
    assert.deepEqual(
      aiTargetToBriefAgeBands("unknown" as AiRecommendInput["target"]),
      [],
    );
  });
});

describe("aiRecommendToOnlineCatalogInput", () => {
  it("maps full AI input to online catalog input using digital budget slice", () => {
    const catalog = [onlineItem("ig-1"), onlineItem("ig-2")];
    const input = aiRecommendToOnlineCatalogInput(
      baseAiInput({ goal: "awareness", industry: "fintech", target: "millennial" }),
      catalog,
      3_500_000,
    );

    assert.equal(input.goal, "brand");
    assert.equal(input.industry, "finance");
    assert.deepEqual(input.ageBands, ["20s", "30s"]);
    assert.deepEqual(input.genders, []);
    assert.equal(input.budgetMan, 350);
    assert.equal(input.catalog.length, 2);
  });

  it("filters non-online catalog rows", () => {
    const oohOnly: MediaItem = {
      ...onlineItem("ooh-1"),
      catalogChannel: "ooh",
      onlineSpec: undefined,
    };
    const input = aiRecommendToOnlineCatalogInput(
      baseAiInput(),
      [oohOnly, onlineItem("ig-1")],
      1_000_000,
    );
    assert.equal(input.catalog.length, 1);
    assert.equal(input.catalog[0]!.id, "ig-1");
  });

  it("clamps negative digital budget to 0 man", () => {
    const input = aiRecommendToOnlineCatalogInput(
      baseAiInput(),
      [onlineItem("ig-1")],
      -100,
    );
    assert.equal(input.budgetMan, 0);
  });
});

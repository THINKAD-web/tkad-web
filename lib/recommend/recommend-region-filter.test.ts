import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "@/lib/media-data";
import type { AiRecommendInput } from "@/lib/ai-media-recommend";
import { aiInputToMatching } from "@/lib/recommendation-adapters";
import {
  filterRecommendCatalogByRegions,
  resolveAiRecommendPlannerRegionIds,
  runRecommendMatchFromCatalog,
  RECOMMEND_REGION_SUPPLEMENT_THRESHOLD,
} from "@/lib/recommend/recommend-region-filter";
import { resolveRecommendPortfolioFromPlanCart } from "@/lib/recommend/recommend-plan-cart";

function mockMedia(
  id: string,
  regionMain: string,
  location: string,
  regionSub?: string,
): MediaItem {
  return {
    id,
    name: location,
    nameEn: location,
    location,
    locationEn: location,
    region: regionMain,
    regionMain,
    regionSub,
    category: "static",
    type: "static",
    price: 100,
    monthlyImpressions: 10000,
    visibility: 80,
    popularity: 50,
    lat: 35.1,
    lng: 129.0,
  } as MediaItem;
}

test("resolveAiRecommendPlannerRegionIds: regionCodes busan", () => {
  const ids = resolveAiRecommendPlannerRegionIds({
    goal: "awareness",
    target: "mass",
    budgetMaxMan: 500,
    region: "busan",
    industry: "other",
    regionCodes: ["busan"],
  });
  assert.deepEqual(ids, ["busan"]);
});

test("resolveAiRecommendPlannerRegionIds: busanZones only", () => {
  const ids = resolveAiRecommendPlannerRegionIds({
    goal: "awareness",
    target: "mass",
    budgetMaxMan: 500,
    region: "all",
    industry: "other",
    busanZones: ["centum"],
  });
  assert.deepEqual(ids, ["busan"]);
});

test("filterRecommendCatalogByRegions: busanZones centum", () => {
  const catalog = [
    mockMedia("c1", "busan", "센텀시티", "busan_haeundae"),
    mockMedia("s1", "busan", "서면역", "busan_seomyeon"),
    mockMedia("x1", "seoul", "강남"),
  ];
  const filtered = filterRecommendCatalogByRegions(catalog, ["busan"], {
    busanZones: ["centum"],
  });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0]?.id, "c1");
});

test("runRecommendMatchFromCatalog: busan input excludes seoul when pool is sufficient", () => {
  const catalog = [
    mockMedia("b1", "busan", "해운대", "busan_haeundae"),
    mockMedia("b2", "busan", "서면", "busan_seomyeon"),
    mockMedia("b3", "busan", "센텀", "busan_haeundae"),
    mockMedia("b4", "busan", "남포", "busan_nampo"),
    mockMedia("b5", "busan", "부산역", "busan_downtown"),
    mockMedia("b6", "busan", "마린시티", "busan_haeundae"),
    mockMedia("s1", "seoul", "강남"),
    mockMedia("g1", "gyeonggi", "판교"),
  ];
  const input: AiRecommendInput = {
    goal: "awareness",
    target: "mass",
    budgetMaxMan: 5000,
    region: "busan",
    industry: "other",
    regionCodes: ["busan"],
  };
  const matching = aiInputToMatching(input, 0);
  const { recommendations, meta } = runRecommendMatchFromCatalog(
    catalog,
    matching,
    5,
    input,
  );
  assert.ok(recommendations.length > 0);
  assert.ok(recommendations.every((r) => r.media.regionMain === "busan"));
  assert.equal(meta.regionSupplemented, false);
  assert.ok(meta.regionalCatalogCount >= RECOMMEND_REGION_SUPPLEMENT_THRESHOLD);
});

test("runRecommendMatchFromCatalog: supplements nationwide when regional pool is small", () => {
  const catalog = [
    mockMedia("b1", "busan", "해운대", "busan_haeundae"),
    mockMedia("b2", "busan", "서면", "busan_seomyeon"),
    mockMedia("s1", "seoul", "강남"),
  ];
  const input: AiRecommendInput = {
    goal: "awareness",
    target: "mass",
    budgetMaxMan: 5000,
    region: "busan",
    industry: "other",
    regionCodes: ["busan"],
  };
  const matching = aiInputToMatching(input, 0);
  const { recommendations, meta } = runRecommendMatchFromCatalog(
    catalog,
    matching,
    5,
    input,
  );
  assert.ok(recommendations.length > 0);
  assert.equal(meta.regionSupplemented, true);
  assert.ok(recommendations.some((r) => r.media.regionMain !== "busan"));
});

test("resolveRecommendPortfolioFromPlanCart: includes non-recommend cart items", () => {
  const catalog = [
    mockMedia("a", "busan", "A"),
    mockMedia("b", "seoul", "B"),
  ];
  const fullList = [{ item: catalog[0]!, score: 90, reasons: [] }];
  const portfolio = resolveRecommendPortfolioFromPlanCart(
    [
      {
        mediaId: "a",
        mediaName: "A",
        mediaType: "static",
        region: "busan",
        price: 100,
        addedFrom: "ai_recommend",
      },
      {
        mediaId: "b",
        mediaName: "B",
        mediaType: "static",
        region: "seoul",
        price: 100,
        addedFrom: "search",
      },
    ],
    fullList,
    catalog,
  );
  assert.deepEqual(
    portfolio.map((m) => m.id),
    ["a", "b"],
  );
});

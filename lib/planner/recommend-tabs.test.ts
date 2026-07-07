import assert from "node:assert/strict";
import test from "node:test";
import { estimatedCpmWon } from "@/lib/ai-recommend-metrics";
import type { MediaItem } from "@/lib/media-data";
import {
  benchmarkAxisRankingMs,
  rankPlannerMediaByAxis,
  rankRecommendMediaByAxis,
  isRecommendIndustryTabAvailable,
} from "@/lib/planner/recommend-tabs";
import type { AiRecommendInput } from "@/lib/ai-media-recommend";
import type { RecommendationContext } from "@/lib/planner/recommendation-context";

function mockMedia(
  id: string,
  overrides: Partial<MediaItem> = {},
): MediaItem {
  return {
    id,
    name: `Media ${id}`,
    nameEn: `Media ${id}`,
    type: "digital",
    region: "seoul",
    location: "강남",
    price: 5_000_000,
    pricePeriod: "month",
    impressions: 1_000_000,
    targetAge: "20-39",
    lat: 37.5,
    lng: 127.0,
    ...overrides,
  } as MediaItem;
}

const baseCtx: RecommendationContext = {
  goal: "brand",
  regions: ["seoul"],
  categories: [],
  ageKeys: ["age20s"],
  industryKey: "indTech",
  budgetMan: 500,
  months: 1,
};

test("rankPlannerMediaByAxis: budget efficiency by ascending CPM", () => {
  const catalog = [
    mockMedia("cheap", { price: 1_000_000, impressions: 2_000_000 }),
    mockMedia("expensive", { price: 20_000_000, impressions: 500_000 }),
    mockMedia("mid", { price: 5_000_000, impressions: 1_000_000 }),
  ];
  const ranked = rankPlannerMediaByAxis(
    catalog,
    baseCtx,
    "budgetEfficiency",
    10,
  );
  assert.ok(ranked.length > 0);
  const cpms = ranked.map((r) => estimatedCpmWon(r.media)!);
  for (let i = 1; i < cpms.length; i++) {
    assert.ok(cpms[i]! >= cpms[i - 1]!);
  }
  assert.equal(ranked[0]!.media.id, "cheap");
});

test("rankPlannerMediaByAxis: target match prefers age overlap", () => {
  const withAge = [
    mockMedia("match", { targetAge: "20대" }),
    mockMedia("miss", { targetAge: "50대" }),
  ];
  const ranked = rankPlannerMediaByAxis(withAge, baseCtx, "targetMatch", 10);
  assert.equal(ranked[0]!.media.id, "match");
  assert.equal(ranked[0]!.breakdown.target, 15);
  assert.ok(ranked[ranked.length - 1]!.breakdown.target < 15);
});

test("rankPlannerMediaByAxis: 659-media benchmark under 500ms", () => {
  const big = Array.from({ length: 659 }, (_, i) =>
    mockMedia(`m-${i}`, {
      price: 1_000_000 + (i % 50) * 100_000,
      impressions: 500_000 + (i % 30) * 10_000,
      targetAge: i % 2 === 0 ? "20-39" : "40-59",
    }),
  );
  const ms = benchmarkAxisRankingMs(big, baseCtx);
  assert.ok(ms < 500, `expected <500ms, got ${ms}`);
  const top = rankPlannerMediaByAxis(big, baseCtx, "goalFit", 10);
  assert.equal(top.length, 10);
  assert.equal(top[0]!.rank, 1);
});

test("isRecommendIndustryTabAvailable: hides other industry", () => {
  assert.equal(
    isRecommendIndustryTabAvailable({ industry: "retail" } as AiRecommendInput),
    true,
  );
  assert.equal(
    isRecommendIndustryTabAvailable({ industry: "other" } as AiRecommendInput),
    false,
  );
});

test("rankRecommendMediaByAxis: uses pickRecommendPool region filter", () => {
  const seoul = mockMedia("seoul-1", { region: "seoul" });
  const busan = mockMedia("busan-1", { region: "busan" });
  const input = {
    goal: "awareness",
    target: "mass",
    budgetMaxMan: 0,
    region: "all",
    industry: "retail",
  } as AiRecommendInput;
  const ranked = rankRecommendMediaByAxis(
    [seoul, busan],
    input,
    ["seoul"],
    "goalFit",
    10,
  );
  assert.ok(ranked.every((r) => r.media.region === "seoul"));
  assert.ok(ranked.length >= 1);
});

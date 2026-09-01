import assert from "node:assert/strict";
import { test } from "node:test";
import {
  classifyBriefIndustryMatch,
  countIndustryTiers,
  industryBonusForTier,
} from "../industry-bonus.ts";
import {
  budgetOverPenalty,
  partitionScoredByBudget,
} from "../budget-ranking.ts";
import {
  buildRecommendedMix,
  scoreMediaCandidates,
} from "../scoring.ts";
import { EMPTY_BRIEF } from "../types.ts";

function fixtureMedia(
  overrides: Partial<import("@/lib/media-data").MediaItem> & { id: string },
) {
  return {
    id: overrides.id,
    name: "테스트 매체",
    nameEn: "Test",
    location: "서울",
    locationEn: "Seoul",
    region: "seoul",
    regionMain: "seoul",
    city: "서울",
    district: "강남구",
    type: "dooh",
    subCategory: "led_screen",
    mediaCategory: ["ooh"],
    price: 10_000_000,
    pricePeriod: "month",
    lat: 37.5,
    lng: 127.0,
    dailyFootTraffic: 100_000,
    visibilityScore: 80,
    ...overrides,
  } as import("@/lib/media-data").MediaItem;
}

test("업종 Strong — name/tags 키워드만 (location 제외)", () => {
  const withTag = fixtureMedia({
    id: "cafe",
    name: "홍대 역 광고",
    location: "서울 마포구 홍대",
    tags: ["카페"],
  });
  const without = fixtureMedia({
    id: "plain",
    name: "홍대 역 광고",
    location: "서울 마포구 홍대",
    tags: [],
  });
  assert.equal(classifyBriefIndustryMatch(withTag, "fb"), "strong");
  assert.equal(classifyBriefIndustryMatch(without, "fb"), "medium");
});

test("업종 보너스 — 평균이 아닌 가산", () => {
  const media = fixtureMedia({
    id: "fnb",
    type: "mobile",
    tags: ["카페"],
    regionMain: "seoul",
    price: 5_000_000,
    dailyFootTraffic: 50_000,
  });
  const brief = {
    ...EMPTY_BRIEF,
    budgetInputWon: 30_000_000,
    budgetMode: "total" as const,
    regionCodes: ["11"] as const,
    industry: "fb" as const,
  };
  const [row] = scoreMediaCandidates({
    candidates: [media],
    brief,
    days: 14,
  });
  assert.ok(row);
  assert.equal(row!.industryBonus, industryBonusForTier("strong"));
  assert.ok(row!.total >= row!.baseTotal);
  assert.equal(
    row!.axes.find((a) => a.key === "industry")?.score,
    100,
  );
});

test("예산 초과 페널티 min(20, (ratio-1)*35)", () => {
  assert.equal(budgetOverPenalty(30_000_000, 30_000_000), 0);
  assert.equal(budgetOverPenalty(39_000_000, 30_000_000), 11);
  assert.equal(budgetOverPenalty(50_000_000, 30_000_000), 20);
});

test("예산 내만 파티션", () => {
  const rows = [
    { overBudget: false },
    { overBudget: true },
    { overBudget: true },
  ];
  const on = partitionScoredByBudget({ scored: rows, budgetWithinOnly: true });
  assert.equal(on.visible.length, 1);
  assert.equal(on.hiddenOverBudgetCount, 2);
  const off = partitionScoredByBudget({ scored: rows, budgetWithinOnly: false });
  assert.equal(off.visible.length, 3);
});

test("믹스 diversity cap — district·type 각 2개", () => {
  const mk = (id: string, district: string, type: string, price: number) =>
    fixtureMedia({
      id,
      district,
      type,
      price,
      dailyFootTraffic: 100_000,
    });
  const scored = [
    { media: mk("a", "마포구", "digital", 5_000_000), total: 90 },
    { media: mk("b", "마포구", "digital", 5_000_000), total: 89 },
    { media: mk("c", "마포구", "digital", 5_000_000), total: 88 },
    { media: mk("d", "성동구", "static", 5_000_000), total: 87 },
    { media: mk("e", "관악구", "mobile", 5_000_000), total: 86 },
  ] as import("../scoring.ts").ScoredMedia[];

  const mix = buildRecommendedMix({
    scored,
    days: 30,
    budgetWon: 50_000_000,
  });
  const ids = mix.map((l) => l.mediaId);
  assert.equal(mix.length, 4);
  assert.ok(!ids.includes("c"), "마포구 digital 3번째는 cap으로 제외");
});

test("countIndustryTiers 집계", () => {
  const candidates = [
    fixtureMedia({ id: "1", tags: ["카페"] }),
    fixtureMedia({ id: "2", type: "mobile" }),
    fixtureMedia({ id: "3", type: "billboard" }),
  ];
  const stats = countIndustryTiers(candidates, "fb");
  assert.equal(stats.strong, 1);
  assert.equal(stats.medium, 1);
  assert.equal(stats.weak, 1);
});

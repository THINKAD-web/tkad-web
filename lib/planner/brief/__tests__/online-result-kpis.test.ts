import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { summarizeOnlineResultKpis } from "@/lib/planner/brief/online-result-kpis";
import type {
  OnlineCatalogRecommendResult,
  ScoredOnlinePlatformGroup,
} from "@/lib/planner/recommend-online-catalog";

function platform(partial: Partial<ScoredOnlinePlatformGroup>): ScoredOnlinePlatformGroup {
  return {
    platform: "p",
    score: 1,
    budgetPct: 10,
    budgetMan: 10,
    topProduct: { id: "m", name: "m", nameEn: "m" } as ScoredOnlinePlatformGroup["topProduct"],
    otherProductCount: 0,
    reasonKo: "",
    reasonEn: "",
    metricType: "impressions",
    estimatedMetricMin: 0,
    estimatedMetricMax: 0,
    ...partial,
  };
}

function result(platforms: ScoredOnlinePlatformGroup[]): OnlineCatalogRecommendResult {
  return {
    platforms,
    totalBudgetMan: platforms.reduce((s, p) => s + p.budgetMan, 0),
    noRelevantChannels: false,
    budgetTooSmall: false,
    excludedForBudget: [],
  };
}

describe("summarizeOnlineResultKpis", () => {
  it("impressions와 clicks를 metricType별로 따로 합산한다", () => {
    const kpis = summarizeOnlineResultKpis(
      result([
        platform({ platform: "a", metricType: "impressions", estimatedMetricMin: 100, estimatedMetricMax: 200, budgetMan: 50 }),
        platform({ platform: "b", metricType: "impressions", estimatedMetricMin: 300, estimatedMetricMax: 400, budgetMan: 50 }),
        platform({ platform: "c", metricType: "clicks", estimatedMetricMin: 10, estimatedMetricMax: 20, budgetMan: 20 }),
      ]),
    );
    assert.equal(kpis.channelCount, 3);
    assert.equal(kpis.totalBudgetMan, 120);
    assert.ok(kpis.impressions);
    assert.equal(kpis.impressions!.min, 400);
    assert.equal(kpis.impressions!.max, 600);
    assert.equal(kpis.impressions!.channelCount, 2);
    assert.equal(kpis.impressions!.channelsWithRateCount, 2);
    assert.ok(kpis.clicks);
    assert.equal(kpis.clicks!.min, 10);
    assert.equal(kpis.clicks!.max, 20);
  });

  it("단가 정보 없는(0~0) 채널은 합계엔 0으로 반영되지만 channelsWithRateCount에서는 빠진다", () => {
    const kpis = summarizeOnlineResultKpis(
      result([
        platform({ platform: "a", metricType: "impressions", estimatedMetricMin: 100, estimatedMetricMax: 200 }),
        platform({ platform: "b", metricType: "impressions", estimatedMetricMin: 0, estimatedMetricMax: 0 }),
      ]),
    );
    assert.equal(kpis.impressions!.min, 100);
    assert.equal(kpis.impressions!.max, 200);
    assert.equal(kpis.impressions!.channelCount, 2);
    assert.equal(kpis.impressions!.channelsWithRateCount, 1);
  });

  it("clicks 채널이 하나도 없으면 clicks는 null", () => {
    const kpis = summarizeOnlineResultKpis(
      result([platform({ metricType: "impressions", estimatedMetricMin: 1, estimatedMetricMax: 2 })]),
    );
    assert.equal(kpis.clicks, null);
    assert.ok(kpis.impressions);
  });

  it("플랫폼이 없으면 둘 다 null, 채널 수·예산 0", () => {
    const kpis = summarizeOnlineResultKpis(result([]));
    assert.equal(kpis.channelCount, 0);
    assert.equal(kpis.totalBudgetMan, 0);
    assert.equal(kpis.impressions, null);
    assert.equal(kpis.clicks, null);
  });
});

/**
 * Phase 2-a: industryKey shifts recommendations without zeroing baseline overlap.
 * Fixture-based — no DB required.
 * Usage: npx tsx scripts/test-planner-industry-reflect.mts
 */
import assert from "node:assert/strict";
import type { MediaItem } from "../lib/media-data";
import { recommendPlannerMedia } from "../lib/planner/recommend";
import type { RecommendationContext } from "../lib/planner/recommendation-context";
import type { PlannerIndustryKey } from "../lib/planner/types";
import { industryStrategyLine } from "../lib/planner/industry-match";
import {
  computePlannerMetrics,
  computePortfolioReportMetrics,
} from "../lib/planner-logic";

function fixtureMedia(
  partial: Pick<MediaItem, "id" | "name" | "price" | "dailyFootTraffic"> &
    Partial<MediaItem>,
): MediaItem {
  return {
    id: partial.id,
    name: partial.name,
    nameEn: partial.name,
    location: partial.location ?? "서울 강남",
    locationEn: partial.locationEn ?? "Gangnam, Seoul",
    region: partial.region ?? "gangnam",
    type: partial.type ?? "digital",
    price: partial.price,
    dailyFootTraffic: partial.dailyFootTraffic,
    visibilityScore: partial.visibilityScore ?? 4,
    targetCategory: partial.targetCategory ?? ["brand"],
    mediaCategory: partial.mediaCategory ?? ["dooh"],
    description: partial.description,
    nearbyFacilities: partial.nearbyFacilities,
    advertiserHistory: partial.advertiserHistory,
    ...partial,
  };
}

const FIXTURE_CATALOG: MediaItem[] = [
  fixtureMedia({
    id: "fb-cafe-strip",
    name: "카페거리 디지털",
    price: 180,
    dailyFootTraffic: 220_000,
    description: "식음료·카페 상권 인접 고유동",
    nearbyFacilities: "레스토랑, 베이커리",
    type: "digital",
  }),
  fixtureMedia({
    id: "fb-restaurant-hub",
    name: "음식점 밀집역",
    price: 160,
    dailyFootTraffic: 190_000,
    description: "F&B dining corridor",
    advertiserHistory: "카페, 주류 브랜드",
    type: "static",
  }),
  fixtureMedia({
    id: "retail-mall",
    name: "백화점 외벽",
    price: 350,
    dailyFootTraffic: 380_000,
    description: "쇼핑·백화점·리테일 동선",
    nearbyFacilities: "department store, mall",
    type: "digital",
  }),
  fixtureMedia({
    id: "retail-outlet",
    name: "아울렛 전광판",
    price: 200,
    dailyFootTraffic: 150_000,
    description: "retail outlet shopping district",
    type: "static",
  }),
  fixtureMedia({
    id: "tech-campus",
    name: "판교 테크 캠퍼스",
    price: 280,
    dailyFootTraffic: 120_000,
    description: "IT software SaaS 클러스터",
    nearbyFacilities: "판교, tech park",
    type: "digital",
  }),
  fixtureMedia({
    id: "generic-pole",
    name: "강남 일반 폴",
    price: 220,
    dailyFootTraffic: 300_000,
    description: "강남 대로 일반 노출",
    type: "static",
  }),
];

function baseCtx(industryKey: PlannerIndustryKey): RecommendationContext {
  return {
    goal: "brand",
    regions: ["gangnam", "강남"],
    categories: ["digital", "static"],
    ageKey: "age20s",
    industryKey,
    budgetMan: 300,
    months: 1,
  };
}

function topIds(industryKey: PlannerIndustryKey, limit = 5): string[] {
  return recommendPlannerMedia(FIXTURE_CATALOG, baseCtx(industryKey), limit).map(
    (s) => s.media.id,
  );
}

function overlap(a: string[], b: string[]): number {
  const setB = new Set(b);
  return a.filter((id) => setB.has(id)).length;
}

const fbIds = topIds("indFb");
const retailIds = topIds("indRetail");
const techIds = topIds("indTech");
const otherIds = topIds("indOther");

console.log("=== Industry reflect (fixture catalog) ===");
console.log(`F&B top:    ${fbIds.join(", ")}`);
console.log(`Retail top: ${retailIds.join(", ")}`);
console.log(`Tech top:   ${techIds.join(", ")}`);
console.log(`Other top:  ${otherIds.join(", ")}`);

const fbRetailOverlap = overlap(fbIds, retailIds);
const fbOtherOverlap = overlap(fbIds, otherIds);
console.log(
  `Overlap F&B↔Retail: ${fbRetailOverlap}/5 · F&B↔Other: ${fbOtherOverlap}/5`,
);

assert(
  fbIds.join() !== retailIds.join() || fbIds.join() !== techIds.join(),
  "industryKey should change top rankings",
);
assert(
  fbIds.some((id) => id.startsWith("fb-")),
  "F&B should rank F&B-tagged fixtures",
);
assert(
  retailIds.some((id) => id.startsWith("retail-")),
  "Retail should rank retail-tagged fixtures",
);
assert(
  techIds.includes("tech-campus"),
  "Tech should include tech-tagged fixture in top 5",
);

const fbLine = industryStrategyLine(true, "indFb", "F&B");
const retailLine = industryStrategyLine(true, "indRetail", "리테일");
assert(fbLine && retailLine && fbLine !== retailLine, "report lines differ by industry");

const portfolio = FIXTURE_CATALOG.filter((m) => fbIds.includes(m.id));
const metricsFb = computePlannerMetrics(portfolio, 300, 1, {
  campaignGoal: "brand",
  industryKey: "indFb",
});
const metricsOther = computePlannerMetrics(portfolio, 300, 1, {
  campaignGoal: "brand",
  industryKey: "indOther",
});
assert(metricsFb && metricsOther);
assert(
  metricsFb.roiExpected >= metricsOther.roiExpected,
  "industry ROI boost should not reduce expected ROI vs other",
);

assert(
  fbOtherOverlap >= 2,
  "baseline overlap with indOther should remain (not full reshuffle)",
);

const portReport = computePortfolioReportMetrics(portfolio, 1);
assert(
  metricsFb.estimatedMonthlyImpressions === portReport.monthlyImpressions,
  "KPI monthly impressions should match portfolio report (single source)",
);
assert(
  metricsFb.estimatedTotalImpressions === portReport.totalImpressions,
  "KPI total impressions should match portfolio report",
);

console.log(
  `Metrics align: KPI monthly=${metricsFb.estimatedMonthlyImpressions} = portfolio ${portReport.monthlyImpressions}`,
);

console.log("\nAll industry reflect checks passed.");

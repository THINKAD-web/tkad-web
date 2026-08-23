/**
 * 「브랜드 인지도」× 일본 시부야 매체 2개 × AI 추천(/recommend) 보고서 회귀 픽스처.
 *
 * 기존 `awareness-campaign-fixture` 는 국내 월정가·브리프 경로만 커버했다.
 * 해외(JP)·주 단위 판매·priceOptions·엔화 각주·AI recommend payload 경로는
 * 실사용에서 처음 검증된 조합이며, 아래 「현행 불일치」 블록은 버그를 고정한다.
 *
 * 앵커(정상 — A-1/A-1b 유지):
 *   - 총노출 262,500 (일 4,375 × 30일 × 2매체)
 *   - 블렌디드 CPM ≈ ₩9,143 (line 합 ₩2,400,000 기준)
 *   - 노출 기여 50% / 50%
 *
 * ⚠️ 「현행 불일치」는 수정 시 깨지는 것이 정상이다.
 */

import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "@/lib/media-data";
import { calculatePlan } from "@/lib/planner/calc/engine";
import {
  analyzeRegionDetailCoverage,
  computeRegionSubdivisionReport,
} from "@/lib/plan-cart-report/region-subdivision";
import { buildReportStrategyLines } from "@/lib/planner/report-strategy";
import {
  plannerMediaPeriodLineWon,
  resolvePlanPeriodInput,
  type PlannerPortfolioPricing,
} from "@/lib/planner/planner-media-quantity";
import { buildOohReportPayload } from "@/lib/planner-report-export/payload-ooh";
import { buildBriefReportPayload } from "@/lib/planner/brief/brief-report-adapter";
import { buildCampaignPlanSnapshot } from "@/lib/planner/brief/build-plan-snapshot";
import { EMPTY_BRIEF } from "@/lib/planner/brief/types";

const ORIGINAL_RATE = process.env.KRW_JPY_RATE;
const ORIGINAL_AS_OF = process.env.KRW_JPY_RATE_AS_OF;

test.after(() => {
  if (ORIGINAL_RATE === undefined) delete process.env.KRW_JPY_RATE;
  else process.env.KRW_JPY_RATE = ORIGINAL_RATE;
  if (ORIGINAL_AS_OF === undefined) delete process.env.KRW_JPY_RATE_AS_OF;
  else process.env.KRW_JPY_RATE_AS_OF = ORIGINAL_AS_OF;
});

function jpMedia(
  o: Partial<MediaItem> & Pick<MediaItem, "id" | "name">,
): MediaItem {
  return {
    nameEn: o.name,
    type: "digital",
    location: "Tokyo Shibuya",
    locationEn: "Shibuya, Tokyo",
    region: "overseas",
    regionMain: "overseas",
    country: "JP",
    price: 0,
    pricePeriod: "week",
    lat: 35.659,
    lng: 139.7,
    dailyFootTraffic: 4_375,
    sampleImages: [],
    ...o,
  } as MediaItem;
}

/** 실사용과 동일 — priceOptions 주단가 + 루트 price(레거시 월환산값) 불일치 */
const CATALOG: MediaItem[] = [
  jpMedia({
    id: "jp-stars-vision",
    name: "스타츠비전",
    price: 1_718_000,
    priceOptions: [{ price: 260_000, period: "week", label: "1주" }],
    district: "Shibuya Crossing",
  }),
  jpMedia({
    id: "jp-shibukuro-vision",
    name: "시부크로비전",
    price: 1_200_000,
    priceOptions: [{ price: 300_000, period: "week", label: "1주" }],
    district: "Shibuya Station",
  }),
];

const BUDGET_MAN = 1_000;
const MONTHS = 1;
const REGIONS_TEXT = "강남 · 성수";

const pricing: PlannerPortfolioPricing = {
  quantities: { "jp-stars-vision": 1, "jp-shibukuro-vision": 1 },
  priceOptionIndex: { "jp-stars-vision": 0, "jp-shibukuro-vision": 0 },
};

const periodCtx = { months: MONTHS };

function aiRecommendPayload(effectSummaryLines: string[]) {
  process.env.KRW_JPY_RATE = "0.1126";
  process.env.KRW_JPY_RATE_AS_OF = "2026-08-18";

  const plan = calculatePlan({
    media: CATALOG.map((m) => ({
      media: m,
      units: pricing.quantities?.[m.id],
      itemNet: plannerMediaPeriodLineWon(m, periodCtx, pricing, true),
    })),
    period: resolvePlanPeriodInput(MONTHS, pricing),
    budgetWon: BUDGET_MAN * 10_000,
    goal: "launch",
    industryKey: "indRetail",
    locale: "ko",
  });

  return buildOohReportPayload({
    isKo: true,
    goalTitle: "브랜드 인지도",
    budgetMan: BUDGET_MAN,
    periodDisplay: "1개월",
    regionsText: REGIONS_TEXT,
    categoriesText: "디지털",
    ageText: "전체",
    industryText: "리테일",
    industryKey: "indRetail",
    campaignGoal: "launch",
    portfolio: CATALOG,
    metrics: {
      estimatedMonthlyImpressions: plan.impressions.monthlyEquivalent,
      estimatedTotalImpressions: plan.impressions.campaignTotal,
      blendedCpmKrw: plan.cpm.campaignWon,
      roiExpected: 3.3,
    },
    blendedCpmKrw: plan.cpm.campaignWon,
    budgetAllocation: plan.breakdown.byCategory.map((s) => ({
      key: s.key,
      label: s.labelKo,
      pct: s.budgetShare,
      valueWon: s.budgetAmount,
      actualWon: s.budgetAmount,
    })),
    cpmBars: [],
    effectSummaryLines,
    generatedAt: "2026-08-23",
    months: MONTHS,
    campaignMediaQuantities: pricing.quantities,
    campaignMediaPriceOptionIndex: pricing.priceOptionIndex,
  });
}

// ── 앵커: A-1/A-1b 해외에서도 유지 ─────────────────────────────────────────

test("총노출·CPM·노출기여 앵커 (해외 주단가)", () => {
  const p = aiRecommendPayload([]);
  const impKpi = p.kpis.find((k) => k.label === "총 예상 노출");
  assert.equal(impKpi?.value, "262,500");
  const cpmKpi = p.kpis.find((k) => k.label.includes("CPM"));
  assert.equal(cpmKpi?.value, "₩9,143");
  for (const row of p.portfolio) {
    assert.equal(row.exposureContributionPct, 50);
  }
});

// ── 이슈 1: AI 경로는 budgetHonesty 미전달 → 1p 「이 구성」 누락 ───────────

test("이슈1 — AI recommend 경로는 budgetHonesty 가 없다 (1p 총 예산만)", () => {
  const p = aiRecommendPayload([]);
  assert.equal(p.budgetHonesty, undefined);
});

test("이슈1 대조 — 브리프 경로는 budgetHonesty 를 채운다", () => {
  const brief = {
    ...EMPTY_BRIEF,
    budgetInputWon: BUDGET_MAN * 10_000,
    budgetMode: "total" as const,
    regionCodes: ["11"] as never,
    goal: "awareness" as const,
    industry: "retail" as const,
    flightStart: "2026-09-01",
    flightEnd: "2026-09-30",
  };
  const plan = buildCampaignPlanSnapshot({
    brief,
    catalog: CATALOG,
    mixUnits: Object.fromEntries(CATALOG.map((m) => [m.id, 1])),
  });
  const p = buildBriefReportPayload({ plan, catalog: CATALOG, isKo: true });
  assert.ok(p.budgetHonesty?.coverValue?.includes("이 구성"));
});

// ── 이슈 2: 추천근거(만원 반올림) vs 배분(원) vs 카드(컴팩트) ─────────────

test("이슈2 — 추천근거·배분·카드 라벨이 서로 다른 반올림 경로를 탄다", () => {
  const p = aiRecommendPayload([]);
  const rationale = p.recommendRationale?.summaryLines[1] ?? "";
  assert.match(rationale, /240만원/);
  const splitWon = p.charts?.budgetSplit?.reduce((s, d) => s + d.value, 0) ?? 0;
  assert.equal(splitWon, 2_400_000);
  const cardCompactMan = p.portfolio.reduce((s, row) => {
    const m = row.lineTotalLabel?.match(/₩(\d+)만/)?.[1];
    return s + (m ? Number(m) : 0);
  }, 0);
  assert.equal(cardCompactMan, 240);
  // 만원 정수 반올림(240)과 원 단위 합(2_400_000)은 일치하지만,
  // 실사용에서 2_391_428 처럼 중간값이 나오면 239만 vs 240만 불일치가 드러난다.
});

// ── 이슈 3 (수정됨) — 상권표 monthly 가 priceOptions SSOT 와 일치 ───────────

test("이슈3 — 상권표 monthly·기간 합계가 플래너 라인과 일치", () => {
  const p = aiRecommendPayload([]);
  const rows = p.regionSubdivision?.breakdown ?? [];
  assert.equal(rows.length, 2);
  const subMonthlySum = rows.reduce((s, r) => s + r.monthlyBudgetWon, 0);
  const subPeriodSum = rows.reduce((s, r) => s + r.periodBudgetWon, 0);
  assert.equal(subMonthlySum, 560_000);
  assert.equal(subPeriodSum, 2_400_000);
  const rootSum = CATALOG.reduce((s, m) => s + m.price, 0);
  assert.notEqual(subMonthlySum, rootSum);
});

// ── 이슈 4: 해외 district — KR taxonomy 미매핑 / 공란 ─────────────────────

test("이슈4 — district 비어 있으면 상권 세분화 자체가 생략된다", () => {
  const emptyDistrict = CATALOG.map((m) => ({ ...m, district: "" }));
  const coverage = analyzeRegionDetailCoverage(emptyDistrict);
  assert.equal(coverage.district, 0);
  assert.equal(coverage.picked, null);
  assert.equal(
    computeRegionSubdivisionReport(emptyDistrict, MONTHS, true, pricing),
    null,
  );
});

test("이슈4 — 해외 자유텍스트 district 는 KR browse 칩이 아닌 원문 그대로", () => {
  const sub = computeRegionSubdivisionReport(CATALOG, MONTHS, true, pricing);
  assert.ok(sub);
  assert.equal(sub.sourceFieldLabel, "행정구·상권(자유텍스트)");
  assert.deepEqual(
    sub.breakdown.map((r) => r.label).sort(),
    ["Shibuya Crossing", "Shibuya Station"],
  );
});

// ── 이슈 5: C안 — 1p KPI pending vs 효과요약 reach/ROI 숫자 ───────────────

test("이슈5 — 1p KPI 는 도달·ROI 산정 중인데 효과요약은 숫자를 낸다", () => {
  const effectLines = [
    "월 예상 노출 262,500회",
    "총 예상 노출 262,500회",
    "핵심 타겟 도달 62% · 확장 노출 38% (모델 추정)",
    "기대 ROI 약 3.3배",
  ];
  const p = aiRecommendPayload(effectLines);
  const reachKpi = p.kpis.find((k) => k.label.includes("도달"));
  assert.equal(reachKpi?.status, "pending");
  assert.equal(reachKpi?.badgeLabel, "산정 중");
  const effect = p.sections.find((s) => s.title === "효과 요약");
  assert.ok(effect?.lines.some((l) => l.includes("62%")));
  assert.ok(effect?.lines.some((l) => l.includes("3.3")));
});

// ── 이슈 6: 월 단가 라벨 + /주 접미사 ─────────────────────────────────────

test("이슈6 — 카드 단가 라벨에 /주 가 붙지만 UI 정적 라벨은 「월 단가」", () => {
  const p = aiRecommendPayload([]);
  for (const row of p.portfolio) {
    assert.match(row.monthlyPriceLabel ?? "", /\/주$/);
    assert.match(row.monthlyPriceLabel ?? "", /^₩\d+만/);
  }
});

// ── 이슈 7: 입력 지역 문구 vs 실제 매체 소재지 ───────────────────────────

test("이슈7 — regionsText·전략요약은 입력값(강남·성수), 매체는 도쿄 시부야", () => {
  const p = aiRecommendPayload([]);
  assert.equal(p.regionsText, REGIONS_TEXT);
  assert.ok(p.regionsText.includes("강남"));
  for (const row of p.portfolio) {
    assert.match(row.location ?? "", /Shibuya|시부야/i);
  }
  const strategy = buildReportStrategyLines({
    isKo: true,
    campaignGoal: "launch",
    goalTitle: "브랜드 인지도",
    industryKey: "indRetail",
    industryText: "리테일",
    regionsText: REGIONS_TEXT,
    seoulZones: [],
    followUp: {},
    portfolioCount: CATALOG.length,
  });
  assert.ok(strategy.some((l) => l.includes("강남") && l.includes("성수")));
});

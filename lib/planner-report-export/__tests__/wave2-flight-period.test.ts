/**
 * A-1b Wave 2 — 브리프 흐름이 `calculatePlan` 에 flight 날짜를 직접 넘기는가.
 *
 * `PlanPeriodInput` 에는 이미 `flight` 종류가 있었다(`lib/planner/calc/types.ts`,
 * 엔진도 처리 구현이 있었다: `lib/planner/calc/engine.ts`). 다만 브리프 보고서 쪽
 * 소비처(payload · 기여도 · 상권) 셋 다 `{kind:"months", months}` 로 우회해,
 * 21일 같은 정수배 아닌 기간이 `Math.round(months × 30)` 을 거쳐야만 일수로
 * 복원됐다 — 결과값은 같아도(증명: `days/30*30 === days`, 부동소수점 오차 없음),
 * 구조적으로는 엔진이 이미 갖춘 `flight` 경로를 안 쓰는 우회였다.
 *
 * 값 자체는 flight·months 어느 경로든 동일하게 나오므로(그게 이번 정리의 요점),
 * "값이 안 바뀐다"만으로는 배선이 실제로 바뀌었는지 증명할 수 없다. 그래서
 * 이 파일은 **months 와 flight 가 서로 다른 기간을 가리키게** 만들어, 실제로
 * flight 가 이긴다는 것을 관찰 가능한 숫자 차이로 증명한다.
 */

import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "@/lib/media-data";
import { buildOohReportPayload } from "@/lib/planner-report-export/payload-ooh";
import { computeRegionSubdivisionReport } from "@/lib/plan-cart-report/region-subdivision";
import { resolvePlanPeriodInput } from "@/lib/planner/planner-media-quantity";

const stubMedia: MediaItem = {
  id: "m-flight-1",
  name: "테스트 매체",
  nameEn: "Test Media",
  type: "digital",
  location: "서울",
  locationEn: "Seoul",
  region: "seoul",
  regionMain: "seoul",
  district: "마포구",
  price: 4_000_000,
  lat: 0,
  lng: 0,
  dailyFootTraffic: 1_000,
  sampleImages: [],
};

// 상권 세분화는 서로 다른 구가 2개 이상 있어야 표를 만든다.
const stubMedia2: MediaItem = {
  ...stubMedia,
  id: "m-flight-2",
  district: "관악구",
};

const baseArgs = {
  isKo: true,
  goalTitle: "브랜드 인지도",
  budgetMan: 3000,
  periodDisplay: "",
  regionsText: "서울",
  categoriesText: "디지털",
  ageText: "전 연령",
  industryText: "F&B",
  portfolio: [stubMedia],
  metrics: null,
  blendedCpmKrw: null,
  budgetAllocation: [],
  cpmBars: [],
  effectSummaryLines: [],
  generatedAt: "2026-09-01",
};

// months=1 이면 30일치, flight 는 21일치 — 서로 다른 기간을 가리키게 만든다.
const MONTHS_IMPLIED_DAYS = 30;
const FLIGHT_DAYS = 21;
const DAILY = 1_000;

function kpiTotal(p: ReturnType<typeof buildOohReportPayload>): number {
  const kpi = p.kpis.find((k) => k.label === "총 예상 노출");
  assert.ok(kpi, "총 예상 노출 KPI 가 있어야 한다");
  return Number(kpi.value.replace(/[^\d]/g, ""));
}

// ── resolvePlanPeriodInput 단위 검사 ────────────────────────────────────────

test("resolvePlanPeriodInput — flight 없으면 months 를 쓴다", () => {
  const input = resolvePlanPeriodInput(1, undefined);
  assert.deepEqual(input, { kind: "months", months: 1 });
});

test("resolvePlanPeriodInput — flight 있으면 months 값과 무관하게 flight 를 쓴다", () => {
  const input = resolvePlanPeriodInput(1, {
    flight: { startDate: "2026-09-01", endDate: "2026-09-21" },
  });
  assert.deepEqual(input, {
    kind: "flight",
    startDate: "2026-09-01",
    endDate: "2026-09-21",
  });
});

// ── buildOohReportPayload — flight 가 months 를 이긴다 ──────────────────────

test("flight 날짜가 있으면 총노출이 flight 일수 기준이다 (months 아님)", () => {
  const p = buildOohReportPayload({
    ...baseArgs,
    months: 1, // 우회 경로였다면 30일치
    flightStart: "2026-09-01",
    flightEnd: "2026-09-21", // 21일
  });
  assert.equal(kpiTotal(p), DAILY * FLIGHT_DAYS, "flight 21일치여야 한다");
  assert.notEqual(
    kpiTotal(p),
    DAILY * MONTHS_IMPLIED_DAYS,
    "months(30일치)로 계산되면 flight 배선이 no-op 이라는 뜻",
  );
});

test("flight 날짜가 없으면 여전히 months 기준이다 (회귀 아님)", () => {
  const p = buildOohReportPayload({
    ...baseArgs,
    months: 1,
  });
  assert.equal(kpiTotal(p), DAILY * MONTHS_IMPLIED_DAYS);
});

test("flight 중 하나만 있으면 months 로 폴백한다", () => {
  const p = buildOohReportPayload({
    ...baseArgs,
    months: 1,
    flightStart: "2026-09-01",
    // flightEnd 없음
  });
  assert.equal(
    kpiTotal(p),
    DAILY * MONTHS_IMPLIED_DAYS,
    "시작일만 있으면 flight 를 쓰지 않는다",
  );
});

// ── computeRegionSubdivisionReport — 같은 배선을 공유한다 ───────────────────

test("상권 세분화도 flight 일수를 쓴다 (매체 기여도 지점과 동일 배선)", () => {
  const report = computeRegionSubdivisionReport(
    [stubMedia, stubMedia2],
    1, // months=1 → 우회 경로였다면 30일치
    true,
    {
      flight: { startDate: "2026-09-01", endDate: "2026-09-21" },
    },
  );
  assert.ok(report);
  const sum = report.breakdown.reduce((s, r) => s + r.totalImpressions, 0);
  assert.equal(sum, DAILY * 2 * FLIGHT_DAYS, "flight 21일치여야 한다");
  assert.notEqual(sum, DAILY * 2 * MONTHS_IMPLIED_DAYS);
});

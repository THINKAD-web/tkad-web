import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "@/lib/media-data";
import { buildOohReportPayload } from "@/lib/planner-report-export/payload-ooh";
import {
  EXPORT_DIGITAL_OMITTED_KO,
  EXPORT_KPI_PENDING_HINT_KO,
} from "@/lib/planner-report-export/export-kpi";
import { assertAllKpisHaveBadge } from "@/lib/planner-report-export/export-badge";

const stubMedia: MediaItem = {
  id: "m-test-1",
  name: "테스트 매체",
  nameEn: "Test Media",
  type: "digital",
  location: "서울",
  locationEn: "Seoul",
  region: "seoul",
  regionMain: "seoul",
  price: 500,
  lat: 0,
  lng: 0,
  dailyFootTraffic: 1000,
  sampleImages: [],
};

const baseArgs = {
  isKo: true,
  goalTitle: "브랜드 인지도",
  budgetMan: 3000,
  periodDisplay: "2026-08-01 ~ 2026-08-31 (1개월)",
  regionsText: "서울",
  categoriesText: "디지털",
  ageText: "전 연령",
  industryText: "F&B",
  portfolio: [stubMedia],
  metrics: {
    estimatedMonthlyImpressions: 120_000,
    estimatedTotalImpressions: 120_000,
    roiExpected: 4.5,
    blendedCpmKrw: 8500,
  } as import("@/lib/planner-logic").PlannerMetrics,
  blendedCpmKrw: 8500,
  budgetAllocation: [
    { key: "digital", label: "디지털", pct: 100, valueWon: 30_000_000 },
  ],
  cpmBars: [{ key: "digital", label: "디지털", value: 8500 }],
  effectSummaryLines: [],
  generatedAt: "2026-08-18",
  months: 1,
};

test("PR-8-3: KPI에 demo reach 62%·ROI 4.5배 없음", () => {
  const payload = buildOohReportPayload(baseArgs);
  const allValues = payload.kpis.map((k) => k.value).join(" ");
  assert.ok(!allValues.includes("62"), "reach 62% removed");
  assert.ok(!allValues.includes("4.5"), "roi 4.5 removed");
  const pending = payload.kpis.filter((k) => k.status === "pending");
  assert.ok(pending.length >= 2, "reach + ROI pending");
  assert.ok(
    pending.every((k) => k.pendingHint === EXPORT_KPI_PENDING_HINT_KO),
    "pending hint",
  );
  assertAllKpisHaveBadge(payload.kpis);
  assert.equal(payload.kpis.find((k) => k.label === "총 예상 노출")?.badge, "estimated");
  assert.ok(
    pending.every((k) => k.badge === "pending"),
    "pending badge kind",
  );
});

test("PR-8-3: strategy 섹션에 demo reach/ROI 숫자 없음", () => {
  const payload = buildOohReportPayload(baseArgs);
  const strategy = payload.sections?.find((s) => s.title === "전략 요약");
  assert.ok(strategy);
  const text = strategy!.lines.join(" ");
  assert.ok(!text.includes("62%"));
  assert.ok(!text.includes("4.5"));
  assert.ok(text.includes("행정동 인구 데이터 연동 후 제공"));
});

test("PR-8-3: digitalOmittedNotice 섹션 포함", () => {
  const payload = buildOohReportPayload({
    ...baseArgs,
    digitalOmittedNotice: EXPORT_DIGITAL_OMITTED_KO,
  });
  assert.equal(payload.digitalOmittedNotice, EXPORT_DIGITAL_OMITTED_KO);
  const digital = payload.sections?.find((s) => s.title === "디지털 채널");
  assert.ok(digital?.lines.includes(EXPORT_DIGITAL_OMITTED_KO));
});

test("PR-8-3: cart 경로 — metrics 있어도 demo KPI 없음", async () => {
  const { buildPlanCartReportBundle } = await import(
    "@/lib/plan-cart-report/build-report.ts"
  );
  const catalog: MediaItem[] = [stubMedia];
  const cart = {
    items: [
      {
        mediaId: stubMedia.id,
        mediaName: stubMedia.name,
        mediaType: stubMedia.type,
        region: stubMedia.region ?? "",
        price: stubMedia.price,
        quantity: 1,
      },
    ],
    campaignGoal: "awareness" as const,
    totalBudget: 3000,
    duration: 1,
    updatedAt: new Date().toISOString(),
  };
  const bundle = buildPlanCartReportBundle({ cart, catalog, isKo: true });
  assert.ok(bundle);
  const payload = buildOohReportPayload({
    isKo: true,
    goalTitle: bundle!.reportProps.goalTitle,
    budgetMan: bundle!.reportProps.budgetNum,
    periodDisplay: "2026-08-01 ~ 2026-08-31",
    regionsText: bundle!.reportProps.regionsText,
    categoriesText: bundle!.reportProps.categoriesText,
    ageText: bundle!.reportProps.ageText,
    industryText: bundle!.reportProps.industryText,
    industryKey: bundle!.reportProps.industryKey,
    campaignGoal: bundle!.reportProps.campaignGoal,
    portfolio: bundle!.reportProps.portfolio,
    metrics: bundle!.reportProps.metrics,
    blendedCpmKrw: null,
    budgetAllocation: [],
    cpmBars: [],
    effectSummaryLines: [],
    generatedAt: "2026-08-18",
    months: 1,
  });
  const joined = JSON.stringify(payload.kpis);
  assert.ok(!joined.includes("62"));
  assert.ok(!/4\.5/.test(joined));
  assertAllKpisHaveBadge(payload.kpis);
  assert.ok(
    payload.kpis.every((k) => k.badge != null),
    "cart path: every KPI has badge",
  );
});

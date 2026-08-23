import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "@/lib/media-data";
import type { CampaignPlanSnapshot } from "@/lib/campaign-plan-schema";
import {
  briefMixQuantities,
  buildBriefReportPayload,
  resolveBriefPortfolio,
  snapshotMetricsToExportMetrics,
} from "@/lib/planner/brief/brief-report-adapter";
import {
  EXPORT_DIGITAL_OMITTED_KO,
  EXPORT_KPI_PENDING_HINT_KO,
} from "@/lib/planner-report-export/export-kpi";

const catalogMedia: MediaItem = {
  id: "m-brief-1",
  name: "브리프 테스트 매체",
  nameEn: "Brief Test Media",
  type: "static",
  location: "서울 강남",
  locationEn: "Seoul Gangnam",
  region: "seoul",
  regionMain: "seoul",
  price: 800,
  lat: 0,
  lng: 0,
  dailyFootTraffic: 5000,
  sampleImages: [],
};

const snapshot: CampaignPlanSnapshot = {
  engineVersion: "test",
  brief: {
    budgetWon: 30_000_000,
    regionCodes: ["11"],
    genders: ["female"],
    ageBands: ["20s", "30s"],
    goal: "awareness",
    industry: "fb",
    flightStart: "2026-08-01",
    flightEnd: "2026-08-31",
  },
  mediaMix: [
    {
      mediaId: catalogMedia.id,
      name: catalogMedia.name,
      units: 2,
      days: 30,
      priceWon: 1_600_000,
      priceIsEstimate: false,
      impressions: 240_000,
      cpmWon: 6667,
    },
  ],
  metrics: {
    netReach: 0,
    targetPopulation: 0,
    reachRate: 0,
    frequency: 0,
    grp: 0,
    effectiveReach: 0,
    effectiveReachRate: 0,
    totalImpressions: 240_000,
    mixCpmWon: 6667,
    totalCostWon: 1_600_000,
    overBudgetWon: 0,
    budgetUsedRate: 1_600_000 / 30_000_000,
    dataQuality: {
      totalCostWon: "measured",
      totalImpressions: "derived",
      mixCpmWon: "derived",
      netReach: null,
      reachRate: null,
      frequency: null,
      grp: null,
    },
  },
};

test("brief-report-adapter: portfolio·quantities 매핑", () => {
  const portfolio = resolveBriefPortfolio(snapshot, [catalogMedia]);
  assert.equal(portfolio.length, 1);
  assert.equal(portfolio[0]!.id, catalogMedia.id);
  assert.deepEqual(briefMixQuantities(snapshot.mediaMix), {
    [catalogMedia.id]: 2,
  });
});

test("brief-report-adapter: demo reach/ROI 없음 + pending KPI", () => {
  const payload = buildBriefReportPayload({
    plan: snapshot,
    catalog: [catalogMedia],
    isKo: true,
  });
  const joined = JSON.stringify(payload);
  assert.ok(!joined.includes("62%"));
  assert.ok(!/4\.5/.test(joined));
  const pending = payload.kpis.filter((k) => k.status === "pending");
  assert.ok(pending.length >= 2);
  assert.ok(
    pending.every((k) => k.pendingHint === EXPORT_KPI_PENDING_HINT_KO),
  );
  assert.ok(payload.kpis.every((k) => k.badge != null));
  assert.equal(payload.kpis.find((k) => k.label === "총 예상 노출")?.badge, "estimated");
});

test("brief-report-adapter: ooh_digital + no digital snapshot → notice", () => {
  const payload = buildBriefReportPayload({
    plan: snapshot,
    catalog: [catalogMedia],
    isKo: true,
    channelMode: "ooh_digital",
    hasDigitalSnapshot: false,
  });
  assert.equal(payload.digitalOmittedNotice, EXPORT_DIGITAL_OMITTED_KO);
  const section = payload.sections?.find((s) => s.title === "디지털 채널");
  assert.ok(section?.lines.includes(EXPORT_DIGITAL_OMITTED_KO));
});

test("snapshotMetricsToExportMetrics: impressions only", () => {
  const m = snapshotMetricsToExportMetrics(snapshot.metrics, 1);
  assert.equal(m.estimatedTotalImpressions, 240_000);
  assert.equal(m.estimatedMonthlyImpressions, 240_000);
  assert.ok(!("roiExpected" in m));
});

test("brief-report-adapter: over-budget honesty uses displayed mix + inquiry copy", () => {
  const priceyMedia: MediaItem = {
    ...catalogMedia,
    id: "m-brief-over",
    price: 35_000_000,
  };
  const over = {
    ...snapshot,
    mediaMix: [
      {
        ...snapshot.mediaMix[0]!,
        mediaId: priceyMedia.id,
        units: 2,
      },
    ],
    metrics: {
      ...snapshot.metrics,
      totalCostWon: 69_000_000,
      overBudgetWon: 39_000_000,
      budgetUsedRate: 69_000_000 / 30_000_000,
    },
  };
  const payload = buildBriefReportPayload({
    plan: over,
    catalog: [priceyMedia],
    isKo: true,
    mixSource: "inquiry_match",
  });
  assert.equal(
    payload.budgetHonesty?.coverValue,
    "요청 예산 ₩30,000,000 / 이 구성 ₩35,000,000 (117%)",
  );
  assert.equal(
    payload.budgetHonesty?.overBudgetBanner,
    "예산 초과 ₩5,000,000 — 수량을 줄이거나 예산을 조정해 주세요.",
  );
  assert.equal(
    payload.budgetHonesty?.mixVsBudgetFootnote,
    "요청 예산 대비 117% 구성입니다",
  );
  assert.equal(payload.mixSource, "inquiry_match");
  assert.ok(
    payload.recommendRationale?.summaryLines[0]?.includes(
      "문의 내용으로 자동 매칭된",
    ),
  );
  assert.equal(
    payload.recommendRationale?.summaryLines.some((l) => l.includes("직접 선택한")),
    false,
  );
});

test("brief-report-adapter: planner hand-pick keeps 직접 선택한", () => {
  const payload = buildBriefReportPayload({
    plan: snapshot,
    catalog: [catalogMedia],
    isKo: true,
  });
  assert.ok(
    payload.recommendRationale?.summaryLines[0]?.includes("직접 선택한"),
  );
});

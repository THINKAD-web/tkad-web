import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "@/lib/media-data";
import type { CampaignPlanSnapshot } from "@/lib/campaign-plan-schema";
import { buildBriefReportPayload } from "@/lib/planner/brief/brief-report-adapter";
import { buildInquiryAutoProposal } from "@/lib/inquiry-auto-proposal/run-dry-run";
import { PILOT_DEFAULT_INQUIRY_TEXT } from "@/lib/inquiry-auto-proposal/pilot-skus";
import type { ProposalCatalogRow } from "@/lib/inquiry-auto-proposal/match-and-options";
import { buildPlannerReportPdf } from "@/lib/planner-report-export/build-pdf";

const catalogMedia: MediaItem = {
  id: "m-pdf-1",
  name: "PDF 테스트 매체",
  nameEn: "PDF Test Media",
  type: "static",
  location: "서울",
  locationEn: "Seoul",
  region: "seoul",
  regionMain: "seoul",
  price: 800,
  lat: 0,
  lng: 0,
  dailyFootTraffic: 5000,
  sampleImages: [],
};

const withinBudgetPlan: CampaignPlanSnapshot = {
  engineVersion: "test",
  brief: {
    budgetWon: 30_000_000,
    regionCodes: ["11"],
    genders: [],
    ageBands: [],
    goal: "awareness",
    industry: "other",
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

function plannerAirport(id: string, name: string, price: number): MediaItem {
  return {
    id,
    name,
    nameEn: name,
    location: "인천국제공항",
    locationEn: "Incheon Airport",
    region: "incheon",
    regionMain: "incheon",
    type: "dooh",
    subCategory: "led_screen",
    mediaSubCategory: "airport",
    mediaMainCategory: "transport",
    price,
    pricePeriod: "month",
    lat: 0,
    lng: 0,
    dailyFootTraffic: 80_000,
    impressions: 2_200_000,
    sampleImages: [`https://cdn.example.test/${id}.jpg`],
  };
}

function proposalRow(item: MediaItem): ProposalCatalogRow {
  return {
    id: item.id,
    name: item.name,
    isActive: true,
    reviewStatus: "clean",
    type: item.type,
    mediaMainCategory: item.mediaMainCategory ?? null,
    mediaSubCategory: item.mediaSubCategory ?? null,
    price: item.price,
    impressions: item.impressions ?? null,
    dailyFootfall: item.dailyFootTraffic,
    location: item.location,
    regionSub: "incheon_airport",
    item,
  };
}

test("PDF export checklist: hand-pick within budget — no banner, 직접 선택한", async () => {
  const payload = buildBriefReportPayload({
    plan: withinBudgetPlan,
    catalog: [catalogMedia],
    isKo: true,
  });
  assert.equal(payload.budgetHonesty?.overBudgetBanner, null);
  assert.ok(
    payload.recommendRationale?.summaryLines[0]?.includes("직접 선택한"),
  );
  const pdf = await buildPlannerReportPdf(payload);
  assert.ok(pdf.byteLength > 10_000);
});

test("PDF export checklist: hand-pick over budget — banner + appendix excluded media", async () => {
  const cheap: MediaItem = {
    ...catalogMedia,
    id: "m-cheap",
    price: 5_000_000,
    pricePeriod: "month",
  };
  const pricey: MediaItem = {
    ...catalogMedia,
    id: "m-pdf-over",
    price: 35_000_000,
    pricePeriod: "month",
    district: "서초구",
    type: "static",
  };
  const overPlan: CampaignPlanSnapshot = {
    ...withinBudgetPlan,
    mediaMix: [
      {
        ...withinBudgetPlan.mediaMix[0]!,
        mediaId: cheap.id,
        name: cheap.name,
        units: 1,
        priceWon: 5_000_000,
      },
      {
        ...withinBudgetPlan.mediaMix[0]!,
        mediaId: pricey.id,
        name: pricey.name,
        units: 1,
        priceWon: 35_000_000,
      },
    ],
    metrics: {
      ...withinBudgetPlan.metrics,
      totalCostWon: 40_000_000,
      overBudgetWon: 10_000_000,
      budgetUsedRate: 40_000_000 / 30_000_000,
    },
  };
  const payload = buildBriefReportPayload({
    plan: overPlan,
    catalog: [cheap, pricey],
    isKo: true,
  });
  assert.ok(payload.budgetHonesty?.overBudgetBanner?.includes("예산 초과"));
  assert.ok(payload.appendixMediaSpecs && payload.appendixMediaSpecs.length >= 1);
  assert.ok(payload.appendixSectionTitle?.includes("제외"));
  const pdf = await buildPlannerReportPdf(payload);
  assert.ok(pdf.byteLength > 10_000);
});

test("PDF export checklist: hand-pick over budget — banner + 직접 선택한", async () => {
  const pricey: MediaItem = {
    ...catalogMedia,
    id: "m-pdf-over",
    price: 35_000_000,
  };
  const overPlan: CampaignPlanSnapshot = {
    ...withinBudgetPlan,
    mediaMix: [
      {
        ...withinBudgetPlan.mediaMix[0]!,
        mediaId: pricey.id,
        units: 2,
      },
    ],
    metrics: {
      ...withinBudgetPlan.metrics,
      totalCostWon: 69_000_000,
      overBudgetWon: 39_000_000,
      budgetUsedRate: 69_000_000 / 30_000_000,
    },
  };
  const payload = buildBriefReportPayload({
    plan: overPlan,
    catalog: [pricey],
    isKo: true,
  });
  assert.ok(payload.budgetHonesty?.overBudgetBanner?.includes("예산 초과"));
  assert.ok(
    payload.recommendRationale?.summaryLines[0]?.includes("직접 선택한"),
  );
  const pdf = await buildPlannerReportPdf(payload);
  assert.ok(pdf.byteLength > 10_000);
});

test("PDF export checklist: admin inquiry dry-run — banner + 문의 자동 매칭", async () => {
  const t1 = plannerAirport("t1", "인천공항 국제선 T1 키로뷰 광고", 12_000_000);
  const t2 = plannerAirport("t2", "인천공항 국제선 T2 키로뷰 광고", 12_000_000);
  const pkg = plannerAirport(
    "pkg",
    "인천국제공항 키로뷰 Full Package 광고",
    20_000_000,
  );
  const t1sq = plannerAirport("t1sq", "인천공항 T1 체크인 스퀘어 광고", 15_000_000);
  const t2wm = plannerAirport("t2wm", "인천공항 T2 웰컴미디어월 광고", 10_000_000);
  const catalog = [t1, t2, pkg, t1sq, t2wm];

  const { payload } = await buildInquiryAutoProposal({
    text: PILOT_DEFAULT_INQUIRY_TEXT,
    proposalCatalog: catalog.map(proposalRow),
    plannerCatalog: catalog,
    flightStart: "2026-09-01",
    generatedAt: "2026-09-01T00:00:00.000Z",
  });

  assert.equal(payload.mixSource, "inquiry_match");
  assert.ok(
    payload.recommendRationale?.summaryLines[0]?.includes(
      "문의 내용으로 자동 매칭된",
    ),
  );
  assert.equal(payload.budgetHonesty?.overBudgetWon ?? 0, 0);
  assert.equal(payload.budgetHonesty?.overBudgetBanner, null);
  assert.ok(payload.budgetHonesty?.coverValue?.includes("이 구성"));
  assert.equal(payload.appendixMediaSpecs?.length, 5);
  assert.equal(payload.appendixMediaSpecs?.filter((s) => s.inBody).length, 2);

  const pdf = await buildPlannerReportPdf(payload);
  assert.ok(pdf.byteLength > 10_000);
});

test("PDF export checklist: regular brief payload — no appendix section", async () => {
  const payload = buildBriefReportPayload({
    plan: withinBudgetPlan,
    catalog: [catalogMedia],
    isKo: true,
  });
  assert.equal(payload.appendixMediaSpecs, undefined);
  const pdf = await buildPlannerReportPdf(payload);
  assert.ok(pdf.byteLength > 10_000);
});

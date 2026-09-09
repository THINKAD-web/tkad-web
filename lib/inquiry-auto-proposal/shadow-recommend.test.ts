import assert from "node:assert/strict";
import { test } from "node:test";
import type { MediaItem } from "@/lib/media-data";
import { PILOT_DEFAULT_INQUIRY_TEXT } from "./pilot-skus";
import { runInquiryAutoProposalDryRun } from "./run-dry-run";
import type { ProposalCatalogRow } from "./match-and-options";
import {
  buildInquiryShadowDiffReport,
  classifyInquiryShadowDiff,
  summarizeInquiryShadowReports,
  type InquiryShadowRunResult,
} from "./shadow-recommend";

/** dry-run 내부 fire-and-forget shadow와 테스트 본문 shadow가 경합하지 않도록 */
process.env.INQUIRY_SHADOW_RECOMMEND = "0";

function row(partial: {
  id: string;
  name: string;
  price: number;
  impressions: number;
  reviewStatus?: string;
  region?: string;
  regionSub?: string;
  location?: string;
  mediaSubCategory?: string;
}): ProposalCatalogRow {
  const item: MediaItem = {
    id: partial.id,
    name: partial.name,
    nameEn: partial.name,
    location: partial.location ?? "인천",
    locationEn: "Incheon",
    region: partial.region ?? "incheon",
    type: "dooh",
    price: partial.price,
    pricePeriod: "month",
    lat: 0,
    lng: 0,
    dailyFootTraffic: 80_000,
    impressions: partial.impressions,
    mediaSubCategory: partial.mediaSubCategory ?? "airport",
    regionSub: partial.regionSub ?? "incheon_airport",
    sampleImages: [],
  };
  return {
    id: partial.id,
    name: partial.name,
    isActive: true,
    reviewStatus: partial.reviewStatus ?? "clean",
    type: "dooh",
    mediaSubCategory: partial.mediaSubCategory ?? "airport",
    price: partial.price,
    impressions: partial.impressions,
    dailyFootfall: 80_000,
    location: partial.location ?? "인천",
    regionSub: partial.regionSub ?? "incheon_airport",
    item,
  };
}

const catalog: ProposalCatalogRow[] = [
  row({
    id: "t1",
    name: "인천공항 국제선 T1 키로뷰 광고",
    price: 12_000_000,
    impressions: 2_200_000,
  }),
  row({
    id: "t2",
    name: "인천공항 국제선 T2 키로뷰 광고",
    price: 12_000_000,
    impressions: 2_300_000,
  }),
  row({
    id: "pkg",
    name: "인천국제공항 키로뷰 Full Package 광고",
    price: 20_000_000,
    impressions: 4_500_000,
  }),
  row({
    id: "checkin",
    name: "인천공항 T1 체크인 스퀘어 광고",
    price: 25_000_000,
    impressions: 3_800_000,
  }),
  row({
    id: "welcome",
    name: "인천공항 T2 웰컴미디어월 광고",
    price: 20_000_000,
    impressions: 3_000_000,
  }),
];

test("classifyInquiryShadowDiff: nearly_identical when mix jaccard >= 0.9", () => {
  const legacyDry = {
    parsed: { raw: "x", budgetWon: 30_000_000, budgetAssumed: false, months: 1, wantsAirport: true, wantsRestStopLed: false, namedNeedles: [] },
    mixUnits: { t1: 1, t2: 1 },
    bodyTotalWon: 24_000_000,
    designated: [],
    eligible: [],
    excluded: [],
    matched: [],
    brief: {} as never,
    appendixMediaSpecs: [],
  };
  const shadow: InquiryShadowRunResult = {
    ok: true,
    aiInputBuilt: true,
    recommendCount: 2,
    recommendTop: [],
    namedLockIns: [],
    legacyDesignatedIds: [],
    shadowDesignatedIds: ["t1", "t2"],
    shadowMix: { mixUnits: { t1: 1, t2: 1 }, selectedIds: ["t1", "t2"], bodyTotalWon: 24_000_000 },
    shadowMixIds: ["t1", "t2"],
  };
  const { category } = classifyInquiryShadowDiff({
    legacyDry: legacyDry as never,
    shadow,
    mixJaccard: 1,
  });
  assert.equal(category, "nearly_identical");
});

test("classifyInquiryShadowDiff: shadow_problematic when shadow mix empty but legacy has mix", () => {
  const legacyDry = {
    parsed: { raw: "x", budgetWon: 30_000_000, budgetAssumed: false, months: 1, wantsAirport: true, wantsRestStopLed: false, namedNeedles: ["인천공항 국제선 T1 키로뷰 광고"] },
    mixUnits: { t1: 1 },
    bodyTotalWon: 12_000_000,
    designated: [{ id: "t1", name: "T1", matchKind: "named" as const }],
    eligible: [],
    excluded: [],
    matched: [],
    brief: {} as never,
    appendixMediaSpecs: [],
  };
  const shadow: InquiryShadowRunResult = {
    ok: true,
    aiInputBuilt: true,
    recommendCount: 0,
    recommendTop: [],
    namedLockIns: [
      {
        needle: "인천공항 국제선 T1 키로뷰 광고",
        matchedIds: ["t1"],
        matchedNames: ["T1"],
        inLegacyDesignated: true,
        inShadowDesignated: false,
        inLegacyMix: true,
        inShadowMix: false,
      },
    ],
    legacyDesignatedIds: ["t1"],
    shadowDesignatedIds: [],
    shadowMix: { mixUnits: {}, selectedIds: [], bodyTotalWon: 0 },
    shadowMixIds: [],
  };
  const { category } = classifyInquiryShadowDiff({
    legacyDry: legacyDry as never,
    shadow,
    mixJaccard: 0,
  });
  assert.equal(category, "shadow_problematic");
});

test("summarizeInquiryShadowReports: blocks promotion when problematic exists", () => {
  const summary = summarizeInquiryShadowReports([
    { category: "nearly_identical" } as never,
    { category: "shadow_problematic", sampleId: "x", notes: ["fail"] } as never,
  ]);
  assert.equal(summary.canPromoteToPrimary, false);
  assert.ok(summary.promotionBlockers.length >= 1);
});

test("buildInquiryShadowDiffReport: pilot catalog legacy path (shadow may fail without DB recommend)", async () => {
  const legacyDry = await runInquiryAutoProposalDryRun(PILOT_DEFAULT_INQUIRY_TEXT, {
    proposalCatalog: catalog,
    flightStart: "2026-09-01",
  });
  assert.equal(Object.keys(legacyDry.mixUnits).length, 2);
  assert.equal(legacyDry.mixUnits.t1, 1);
  assert.equal(legacyDry.mixUnits.t2, 1);
});

/** STEP3d — shadow recommend golden snapshot (pilot fixture; DB/catalog fetch 없음) */
const PILOT_SHADOW_GOLDEN = {
  recommendCount: 5,
  recommendTopIds: ["welcome", "t2", "t1", "checkin", "pkg"],
  recommendTopScores: [
    { id: "welcome", score: 100 },
    { id: "t2", score: 72 },
    { id: "t1", score: 72 },
    { id: "checkin", score: 72 },
    { id: "pkg", score: 72 },
  ],
  shadowMixIds: ["t2", "t1"],
  category: "nearly_identical" as const,
  mixJaccard: 1,
};

test("buildInquiryShadowDiffReport: pilot golden snapshot — recommendTop ids/scores + shadowMixIds", async () => {
  const legacyDry = await runInquiryAutoProposalDryRun(PILOT_DEFAULT_INQUIRY_TEXT, {
    proposalCatalog: catalog,
    flightStart: "2026-09-01",
  });
  const report = await buildInquiryShadowDiffReport({
    text: PILOT_DEFAULT_INQUIRY_TEXT,
    legacyDry,
    proposalCatalog: catalog,
    sampleId: "pilot-default",
  });

  assert.equal(report.shadow.ok, true);
  assert.equal(report.shadow.recommendCount, PILOT_SHADOW_GOLDEN.recommendCount);
  assert.deepEqual(
    report.shadow.recommendTop.map((r) => r.id),
    PILOT_SHADOW_GOLDEN.recommendTopIds,
  );
  assert.deepEqual(
    report.shadow.recommendTop.map((r) => ({ id: r.id, score: r.score })),
    PILOT_SHADOW_GOLDEN.recommendTopScores,
  );
  assert.deepEqual(report.shadowMixIds, PILOT_SHADOW_GOLDEN.shadowMixIds);
  assert.equal(report.category, PILOT_SHADOW_GOLDEN.category);
  assert.equal(report.mixJaccard, PILOT_SHADOW_GOLDEN.mixJaccard);
});

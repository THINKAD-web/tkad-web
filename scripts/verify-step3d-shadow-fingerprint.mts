import { runInquiryAutoProposalDryRun } from "@/lib/inquiry-auto-proposal/run-dry-run";
import { buildInquiryShadowDiffReport } from "@/lib/inquiry-auto-proposal/shadow-recommend";
import { PILOT_DEFAULT_INQUIRY_TEXT } from "@/lib/inquiry-auto-proposal/pilot-skus";
import type { MediaItem } from "@/lib/media-data";
import type { ProposalCatalogRow } from "@/lib/inquiry-auto-proposal/match-and-options";

function row(partial: {
  id: string;
  name: string;
  price: number;
  impressions: number;
}): ProposalCatalogRow {
  const item: MediaItem = {
    id: partial.id,
    name: partial.name,
    nameEn: partial.name,
    location: "인천",
    locationEn: "Incheon",
    region: "incheon",
    type: "dooh",
    price: partial.price,
    pricePeriod: "month",
    lat: 0,
    lng: 0,
    dailyFootTraffic: 80_000,
    impressions: partial.impressions,
    mediaSubCategory: "airport",
    regionSub: "incheon_airport",
    sampleImages: [],
  };
  return {
    id: partial.id,
    name: partial.name,
    isActive: true,
    reviewStatus: "clean",
    type: "dooh",
    mediaSubCategory: "airport",
    price: partial.price,
    impressions: partial.impressions,
    dailyFootfall: 80_000,
    location: "인천",
    regionSub: "incheon_airport",
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

process.env.INQUIRY_SHADOW_RECOMMEND = "0";

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

const fingerprint = {
  recommendCount: report.shadow.recommendCount,
  recommendTopIds: report.shadow.recommendTop.slice(0, 5).map((r) => r.id),
  recommendTopScores: report.shadow.recommendTop
    .slice(0, 5)
    .map((r) => ({ id: r.id, score: r.score })),
  shadowMixIds: report.shadowMixIds,
  category: report.category,
  mixJaccard: report.mixJaccard,
};
console.log(JSON.stringify(fingerprint, null, 2));

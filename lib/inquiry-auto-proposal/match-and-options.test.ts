import assert from "node:assert/strict";
import { test } from "node:test";
import type { MediaItem } from "@/lib/media-data";
import { parseInquiryProposalText } from "./parse-inquiry-text";
import {
  matchInquiryMedia,
  type ProposalCatalogRow,
} from "./match-and-options";
import { PILOT_DEFAULT_INQUIRY_TEXT } from "./pilot-skus";
import { inquiryMixUnits } from "./to-brief";
import { runInquiryAutoProposalDryRun } from "./run-dry-run";

function row(partial: {
  id: string;
  name: string;
  price: number;
  impressions: number;
  reviewStatus?: string;
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
    region: "incheon",
    type: "digital",
    price: partial.price,
    pricePeriod: "month",
    lat: 0,
    lng: 0,
    dailyFootTraffic: 80_000,
    impressions: partial.impressions,
    mediaSubCategory: partial.mediaSubCategory ?? "airport",
    regionSub: partial.regionSub,
    sampleImages: [],
  };
  return {
    id: partial.id,
    name: partial.name,
    isActive: true,
    reviewStatus: partial.reviewStatus ?? "clean",
    type: "digital",
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
  row({
    id: "rest",
    name: "정안 알밤(순천방향)휴게소 전광판 광고",
    price: 4_000_000,
    impressions: 3_800_000,
    mediaSubCategory: "digital_signage",
    regionSub: undefined,
    location: "충남 공주시 정안 휴게소",
  }),
  row({
    id: "flagged-air",
    name: "에어부산 기내지 FLY&FUN 광고",
    price: 5_333_333,
    impressions: 2_100_000,
    reviewStatus: "flagged",
  }),
];

test("parses budget 3000만 and airport + rest-stop intent", () => {
  const p = parseInquiryProposalText(PILOT_DEFAULT_INQUIRY_TEXT);
  assert.equal(p.budgetWon, 30_000_000);
  assert.equal(p.wantsAirport, true);
  assert.equal(p.wantsRestStopLed, true);
  assert.equal(p.namedNeedles.length, 5);
});

test("filters flagged and out-of-bounds CPM from mixUnits", async () => {
  const parsed = parseInquiryProposalText(PILOT_DEFAULT_INQUIRY_TEXT);
  const matched = matchInquiryMedia(catalog, parsed);
  const flagged = matched.find((m) => m.id === "flagged-air");
  assert.equal(flagged, undefined, "noise airport not named should not match");

  const pkg = matched.find((m) => m.id === "pkg");
  assert.ok(pkg);
  assert.equal(pkg!.eligible, false);
  assert.ok(pkg!.reasons.includes("cpm_class_bounds"));

  const rest = matched.find((m) => m.id === "rest");
  assert.ok(rest);
  assert.equal(rest!.eligible, false);
  assert.ok(rest!.reasons.includes("cpm_class_bounds"));

  const dry = await runInquiryAutoProposalDryRun(PILOT_DEFAULT_INQUIRY_TEXT, {
    proposalCatalog: catalog,
    flightStart: "2026-09-01",
  });
  assert.equal(dry.mixUnits.pkg, undefined);
  assert.equal(dry.mixUnits.rest, undefined);
  assert.equal(dry.mixUnits["flagged-air"], undefined);
  assert.equal(dry.mixUnits.t1, 1);
  assert.equal(dry.mixUnits.t2, 1);
  assert.deepEqual(inquiryMixUnits(dry.eligible.map((m) => m.id)), dry.mixUnits);
});

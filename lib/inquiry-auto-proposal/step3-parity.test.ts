import assert from "node:assert/strict";
import { test } from "node:test";
import type { MediaItem } from "@/lib/media-data";
import { flightDays, type CampaignBriefInput } from "@/lib/planner/brief/types";
import { buildCampaignPlanSnapshot } from "@/lib/planner/brief/build-plan-snapshot";
import { parseInquiryProposalText } from "./parse-inquiry-text";
import { PILOT_DEFAULT_INQUIRY_TEXT } from "./pilot-skus";
import {
  inclusiveFlightEnd,
  inquiryMixUnits,
  inquiryToBrief,
} from "./to-brief";
import { buildInquiryAutoProposal } from "./run-dry-run";
import type { ProposalCatalogRow } from "./match-and-options";

function plannerMedia(over: Partial<MediaItem> & { id: string; name: string }): MediaItem {
  return {
    id: over.id,
    name: over.name,
    nameEn: over.name,
    location: "인천국제공항",
    locationEn: "Incheon Airport",
    region: "incheon",
    regionMain: "incheon",
    type: "dooh",
    subCategory: "led_screen",
    mediaSubCategory: "airport",
    mediaMainCategory: "transport",
    price: 12_000_000,
    pricePeriod: "month",
    lat: 0,
    lng: 0,
    dailyFootTraffic: 80_000,
    impressions: 2_200_000,
    sampleImages: [`https://cdn.example.test/${over.id}.jpg`],
    ...over,
  };
}

function proposalRow(item: MediaItem, extra?: Partial<ProposalCatalogRow>): ProposalCatalogRow {
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
    ...extra,
  };
}

const T1 = plannerMedia({
  id: "t1",
  name: "인천공항 국제선 T1 키로뷰 광고",
});
const T2 = plannerMedia({
  id: "t2",
  name: "인천공항 국제선 T2 키로뷰 광고",
  impressions: 2_300_000,
});

test("inquiryToBrief: total 3000만 and inclusive 30-day flight", () => {
  const parsed = parseInquiryProposalText(PILOT_DEFAULT_INQUIRY_TEXT);
  const brief = inquiryToBrief(parsed, { flightStart: "2026-09-01" });
  assert.equal(brief.budgetMode, "total");
  assert.equal(brief.budgetInputWon, 30_000_000);
  assert.equal(brief.flightStart, "2026-09-01");
  assert.equal(brief.flightEnd, "2026-09-30");
  assert.equal(inclusiveFlightEnd("2026-09-01", 30), "2026-09-30");
  assert.equal(flightDays(brief), 30);
  assert.deepEqual(brief.regionCodes, ["28"]);
  assert.equal(brief.freeText, parsed.raw);
});

test("inquiryMixUnits is 1 per eligible id", () => {
  assert.deepEqual(inquiryMixUnits(["t1", "t2", "t1"]), { t1: 1, t2: 1 });
});

test("auto brief+mixUnits snapshot metrics match hand-built Step 3 snapshot", async () => {
  const parsed = parseInquiryProposalText(PILOT_DEFAULT_INQUIRY_TEXT);
  const catalog = [T1, T2];
  const mixUnits = inquiryMixUnits(["t1", "t2"]);
  const autoBrief = inquiryToBrief(parsed, { flightStart: "2026-09-01" });
  const manualBrief: CampaignBriefInput = {
    budgetInputWon: 30_000_000,
    budgetMode: "total",
    regionCodes: ["28"],
    genders: [],
    ageBands: [],
    goal: null,
    industry: null,
    flightStart: "2026-09-01",
    flightEnd: "2026-09-30",
    freeText: parsed.raw,
  };

  const step3 = buildCampaignPlanSnapshot({
    brief: manualBrief,
    catalog,
    mixUnits,
  });
  const autoSnap = buildCampaignPlanSnapshot({
    brief: autoBrief,
    catalog,
    mixUnits,
  });

  assert.deepEqual(autoBrief, manualBrief);
  assert.deepEqual(autoSnap.metrics, step3.metrics);
  assert.deepEqual(autoSnap.mediaMix, step3.mediaMix);

  const pkg = plannerMedia({
    id: "pkg",
    name: "인천국제공항 키로뷰 Full Package 광고",
    price: 20_000_000,
    impressions: 4_500_000,
  });
  const built = await buildInquiryAutoProposal({
    text: PILOT_DEFAULT_INQUIRY_TEXT,
    proposalCatalog: [
      proposalRow(T1),
      proposalRow(T2),
      proposalRow(pkg),
    ],
    plannerCatalog: catalog,
    flightStart: "2026-09-01",
    generatedAt: "2026-09-01T00:00:00.000Z",
  });

  assert.deepEqual(built.dryRun.mixUnits, mixUnits);
  assert.deepEqual(built.snapshot.metrics, step3.metrics);
  assert.deepEqual(
    [...built.snapshot.mediaMix].sort((a, b) => a.mediaId.localeCompare(b.mediaId)),
    [...step3.mediaMix].sort((a, b) => a.mediaId.localeCompare(b.mediaId)),
  );

  const thumbs = built.payload.portfolio.map((r) => r.thumbUrl);
  assert.ok(thumbs.includes("https://cdn.example.test/t1.jpg"));
  assert.ok(thumbs.includes("https://cdn.example.test/t2.jpg"));
  assert.equal(
    thumbs.filter((u) => Boolean(u?.trim())).length,
    built.payload.portfolio.length,
  );
});

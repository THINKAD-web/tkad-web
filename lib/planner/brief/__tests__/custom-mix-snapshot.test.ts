import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeMediaMix,
  snapshotWithEngineVersion,
} from "@/lib/campaign-plan-schema";
import type { MediaItem } from "../../../media-data.ts";
import { buildCampaignPlanSnapshot } from "../build-plan-snapshot.ts";
import {
  createBriefCustomLine,
  normalizeBriefCustomLines,
} from "../custom-lines.ts";
import { EMPTY_BRIEF } from "../types.ts";

function fixtureMedia(over: Partial<MediaItem> = {}): MediaItem {
  return {
    id: "fx-1",
    name: "픽스처 DOOH",
    nameEn: "Fixture DOOH",
    location: "서울 강남",
    locationEn: "Gangnam, Seoul",
    region: "seoul",
    regionMain: "seoul",
    city: "서울",
    district: "강남구",
    type: "dooh",
    subCategory: "led_screen",
    mediaSubCategory: "office",
    mediaMainCategory: "building",
    price: 10_000_000,
    pricePeriod: "month",
    lat: 37.5,
    lng: 127.0,
    dailyFootTraffic: 50_000,
    impressions: 1_500_000,
    sampleImages: [],
    ...over,
  };
}

test("legacy 저장 mediaMix (kind 없음) normalize 후 catalog 로 읽힘", () => {
  const legacyJson = [
    {
      mediaId: "m-old",
      name: "레거시",
      units: 1,
      days: 30,
      priceWon: 12_000_000,
      priceIsEstimate: false,
      impressions: 800_000,
      cpmWon: 15_000,
    },
  ];
  const normalized = normalizeMediaMix(legacyJson);
  assert.equal(normalized.length, 1);
  assert.equal(normalized[0]!.mediaId, "m-old");
  assert.notEqual(normalized[0]!.kind, "custom");

  const snap = snapshotWithEngineVersion({
    brief: {
      budgetWon: 30_000_000,
      regionCodes: ["11"],
      flightStart: "2026-09-01",
      flightEnd: "2026-09-30",
    },
    mediaMix: normalized,
    metrics: {
      netReach: 0,
      targetPopulation: 0,
      reachRate: 0,
      frequency: 0,
      grp: 0,
      effectiveReach: 0,
      effectiveReachRate: 0,
      totalImpressions: 800_000,
      mixCpmWon: 15_000,
      totalCostWon: 12_000_000,
      overBudgetWon: 0,
      budgetUsedRate: 0.4,
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
  });
  assert.equal(snap.mediaMix[0]!.mediaId, "m-old");
});

test("buildCampaignPlanSnapshot: customLines denormalize + cost 합산", () => {
  const media = fixtureMedia({ id: "cat-1", price: 10_000_000 });
  const custom = createBriefCustomLine({
    name: "일회성 협의",
    quantity: 2,
    unitPriceWon: 1_000_000,
  });

  const catalogOnly = buildCampaignPlanSnapshot({
    brief: {
      ...EMPTY_BRIEF,
      budgetInputWon: 50_000_000,
      budgetMode: "total",
      flightStart: "2026-09-01",
      flightEnd: "2026-09-30",
    },
    catalog: [media],
    mixUnits: { [media.id]: 1 },
  });

  const mixed = buildCampaignPlanSnapshot({
    brief: {
      ...EMPTY_BRIEF,
      budgetInputWon: 50_000_000,
      budgetMode: "total",
      flightStart: "2026-09-01",
      flightEnd: "2026-09-30",
    },
    catalog: [media],
    mixUnits: { [media.id]: 1 },
    customLines: [custom],
  });

  assert.equal(mixed.mediaMix.length, 2);
  const customEntry = mixed.mediaMix.find((e) => e.kind === "custom");
  assert.ok(customEntry);
  assert.equal(customEntry!.name, "일회성 협의");
  assert.equal(customEntry!.priceWon, 2_000_000);
  assert.equal(customEntry!.days, 30);

  assert.equal(
    mixed.metrics.totalCostWon,
    catalogOnly.metrics.totalCostWon + 2_000_000,
  );
  assert.equal(mixed.metrics.mixCpmWon, null);
  assert.equal(
    mixed.metrics.totalImpressions,
    catalogOnly.metrics.totalImpressions,
  );
});

test("customLines only snapshot", () => {
  const custom = createBriefCustomLine({
    name: "커스텀만",
    quantity: 1,
    unitPriceWon: 5_000_000,
  });
  const snap = buildCampaignPlanSnapshot({
    brief: {
      ...EMPTY_BRIEF,
      budgetInputWon: 10_000_000,
      budgetMode: "total",
    },
    catalog: [],
    mixUnits: {},
    customLines: [custom],
  });
  assert.equal(snap.mediaMix.length, 1);
  assert.equal(snap.mediaMix[0]!.kind, "custom");
  assert.equal(snap.metrics.totalCostWon, 5_000_000);
  assert.equal(snap.metrics.totalImpressions, 0);
});

test("normalizeBriefCustomLines drops invalid rows", () => {
  const lines = normalizeBriefCustomLines([
    { lineId: "custom-a", name: "OK", quantity: 1, unitPriceWon: 100 },
    { lineId: "custom-b", name: "", quantity: 1, unitPriceWon: 100 },
    { name: "no qty", unitPriceWon: 100 },
  ]);
  assert.equal(lines.length, 1);
  assert.equal(lines[0]!.lineId, "custom-a");
  assert.equal(lines[0]!.name, "OK");
});

#!/usr/bin/env npx tsx
/**
 * A-4 region mapping — local inference diagnosis (no DB required).
 * Run: npx tsx scripts/a4-diagnose-region-mapping.mts
 */
import { inferBrowseRegionFromMedia } from "../lib/media-browse-regions.ts";
import { mapDistrictToRegionZone } from "../lib/media-regions.ts";
import { calculatePlan } from "../lib/planner/calc/engine.ts";
import {
  computeRegionSubdivisionReport,
  resolveBrowseRegionSubId,
} from "../lib/plan-cart-report/region-subdivision.ts";
import type { MediaItem } from "../lib/media-data.ts";

type Case = {
  id: string;
  issue: "3-1" | "3-2" | "3-3";
  input: Partial<MediaItem> & { id: string };
  note?: string;
};

function asMedia(c: Case["input"]): MediaItem {
  return {
    name: c.name ?? c.id,
    nameEn: c.nameEn ?? c.id,
    location: c.location ?? "서울",
    locationEn: "Seoul",
    region: c.region ?? "seoul",
    type: c.type ?? "digital",
    price: c.price ?? 0,
    lat: 37.5,
    lng: 127,
    dailyFootTraffic: c.dailyFootTraffic ?? 100_000,
    sampleImages: [],
    ...c,
  } as MediaItem;
}

const CASES: Case[] = [
  {
    id: "seoul_univ_gwanak_district",
    issue: "3-1",
    input: {
      id: "m1",
      regionMain: "seoul",
      regionSub: null,
      regionZone: "gwanak",
      district: "관악구",
      city: "서울",
      location: "서울대입구역 2호선",
      name: "서울대입구역 맥스비전",
    },
    note: "sub null → inference tie-break seoul_gangnam (NOT production path)",
  },
  {
    id: "seoul_univ_wrong_guro_sub",
    issue: "3-1",
    input: {
      id: "m1",
      regionMain: "seoul",
      regionSub: "seoul_guro",
      regionZone: "gwanak",
      district: "관악구",
      city: "서울",
      location: "서울대입구역",
      name: "서울대입구역",
      price: 4_000_000,
    },
    note: "Production-like: stored seoul_guro → PDF shows 구로/신도림",
  },
  {
    id: "busan_city_bus_default",
    issue: "3-2",
    input: {
      id: "bus",
      regionMain: "busan",
      regionSub: null,
      regionZone: null,
      district: null,
      city: "부산",
      location: "부산 시내버스 전 노선",
      name: "부산 시내버스 래핑",
      type: "mobile",
    },
    note: "Bare region=busan often infers busan_downtown",
  },
  {
    id: "jp_shibuya_overseas_sub",
    issue: "3-3",
    input: {
      id: "jp1",
      regionMain: "overseas",
      regionSub: "overseas",
      region: "overseas",
      regionZone: null,
      district: "Shibuya Crossing",
      city: "Tokyo",
      location: "Shibuya Crossing, Tokyo",
      name: "Shibuya Vision",
      country: "JP",
    },
    note: "regionSub=overseas wins over district → 상권표 omitted (pre-fix)",
  },
  {
    id: "jp_shibuya_district_only",
    issue: "3-3",
    input: {
      id: "jp2",
      regionMain: "overseas",
      regionSub: null,
      region: "overseas",
      regionZone: null,
      district: "Shibuya Station",
      city: "Tokyo",
      location: "Shibuya Station",
      name: "Shibuya Station Vision",
      country: "JP",
    },
    note: "Without regionSub, district can classify (needs 2+ distinct keys)",
  },
];

console.log("=== A-4 Region Mapping Diagnosis ===\n");

for (const c of CASES) {
  const m = asMedia(c.input);
  const inferred = inferBrowseRegionFromMedia({
    region: c.input.region ?? c.input.regionMain ?? null,
    regionZone: c.input.regionZone ?? null,
    city: c.input.city ?? null,
    district: c.input.district ?? null,
    location: c.input.location ?? null,
  });
  const zone =
    c.input.district != null
      ? mapDistrictToRegionZone(c.input.district, c.input.regionMain ?? undefined)
      : null;

  const plan = calculatePlan({
    media: [{ media: m, itemNet: m.price ?? 1 }],
    period: { kind: "days", days: 21 },
    budgetWon: m.price ?? 1,
  });
  const engineRegion = plan.mediaItems[0]!.region;

  console.log(`[${c.issue}] ${c.id}`);
  console.log(`  note: ${c.note ?? ""}`);
  console.log(`  stored regionSub: ${c.input.regionSub ?? "(null)"}`);
  console.log(`  resolveBrowseRegionSubId: ${resolveBrowseRegionSubId(c.input.regionSub ?? "") ?? "(null)"}`);
  console.log(`  inferBrowseRegionFromMedia: ${inferred.main ?? "?"}/${inferred.sub ?? "?"}`);
  console.log(`  resolveRegionRef (engine): ${engineRegion.labelKo} (subId=${engineRegion.subId}, mapped=${engineRegion.mapped})`);
  console.log(`  regionZone from district: ${zone ?? "(null)"}`);
  console.log("");
}

// 3-1 portfolio path: stored guro vs mixed null
const koreaPortfolio = [
  asMedia({
    id: "m1",
    name: "서울대입구역 맥스비전",
    district: "관악구",
    regionZone: "gwanak",
    regionMain: "seoul",
    regionSub: null,
    price: 4_000_000,
    dailyFootTraffic: 165_000,
  }),
  asMedia({
    id: "m2",
    name: "이마트24",
    district: "구로구",
    regionZone: "gangseo",
    regionMain: "seoul",
    regionSub: "seoul_guro",
    price: 2_000_000,
    dailyFootTraffic: 35_000,
  }),
  asMedia({
    id: "m3",
    name: "홍대",
    district: "마포구",
    regionZone: "mapo",
    regionMain: "seoul",
    regionSub: "seoul_hongdae",
    price: 1_000_000,
    dailyFootTraffic: 90_000,
  }),
];

const koreaGuroSub = koreaPortfolio.map((m) =>
  m.id === "m1" ? { ...m, regionSub: "seoul_guro" } : m,
);

for (const [label, portfolio] of [
  ["3-1 mixed (m1 sub null)", koreaPortfolio],
  ["3-1 production-like (m1 seoul_guro)", koreaGuroSub],
] as const) {
  const sub = computeRegionSubdivisionReport(portfolio, 0.7, true);
  console.log(`=== ${label} ===`);
  if (sub) {
    console.log(`  field: ${sub.sourceField} (${sub.sourceFieldLabel})`);
    console.log(`  rows: ${sub.breakdown.map((r) => `${r.label}×${r.mediaCount}`).join(", ")}`);
  } else {
    console.log("  상권표: omitted");
  }
  console.log("");
}

console.log("Done. See reports/a4-region-mapping-diagnosis.md for full write-up.");

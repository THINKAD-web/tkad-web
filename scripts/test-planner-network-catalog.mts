/**
 * Planner network catalog + region matching tests (mock fixtures).
 * Run: npx tsx scripts/test-planner-network-catalog.mts
 */
import assert from "node:assert/strict";
import type { MediaItem } from "../lib/media-data.ts";
import { matchesPlannerRegion } from "../lib/planner/planner-regions.ts";
import { filterPlannerMediaMulti } from "../lib/planner-logic.ts";
import { recommendPlannerMedia } from "../lib/planner/recommend.ts";
import { mediaRegionHaystack } from "../lib/media-region-haystack.ts";
import { NETWORK_CATALOG_ID_PREFIX } from "../lib/media-network-public.ts";

function mockNetwork(
  id: string,
  opts: {
    regions?: string[];
    locations?: Array<{ name: string; regionMain?: string; regionSub?: string }>;
    price?: number;
  } = {},
): MediaItem {
  return {
    id: `${NETWORK_CATALOG_ID_PREFIX}${id}`,
    name: `Network ${id}`,
    location: "전국",
    type: "network",
    catalogSource: "network",
    price: opts.price ?? 3_000_000,
    lat: 37.5,
    lng: 127.0,
    dailyFootTraffic: 100_000,
    region: "national",
    networkRegionLabels: opts.regions,
    networkLocations: opts.locations?.map((l) => ({
      name: l.name,
      unitCount: 1,
      regionMain: l.regionMain,
      regionSub: l.regionSub,
    })),
  } as MediaItem;
}

function mockSingle(id: string, region: string): MediaItem {
  return {
    id,
    name: `Single ${id}`,
    location: region,
    type: "digital",
    price: 2_000_000,
    lat: 37.5,
    lng: 127.0,
    dailyFootTraffic: 50_000,
    region,
    regionMain: region,
  } as MediaItem;
}

const gangnamNetwork = mockNetwork("cu-gangnam", {
  regions: ["서울"],
  locations: [
    { name: "강남역 CU", regionMain: "seoul", regionSub: "gangnam" },
    { name: "부산 서면", regionMain: "busan" },
  ],
});

assert.ok(
  matchesPlannerRegion(gangnamNetwork, "seoul"),
  "network with seoul branch matches seoul",
);
assert.ok(
  matchesPlannerRegion(gangnamNetwork, "busan"),
  "network with busan-only branch matches busan",
);
assert.ok(
  !matchesPlannerRegion(gangnamNetwork, "jeju"),
  "network without jeju branch does not match jeju",
);

const hay = mediaRegionHaystack(gangnamNetwork);
assert.ok(hay.includes("강남역"), "haystack includes branch name");

const catalog = [
  mockSingle("m1", "seoul"),
  mockSingle("m2", "busan"),
  gangnamNetwork,
  mockNetwork("zero-price", { price: 0, locations: [{ name: "x", regionMain: "seoul" }] }),
];

const filtered = filterPlannerMediaMulti(
  catalog,
  new Set(["seoul"]),
  new Set(["digital"]),
  [],
);
assert.ok(
  filtered.some((m) => m.id.startsWith(NETWORK_CATALOG_ID_PREFIX)),
  "seoul + digital filter includes network",
);

const recs = recommendPlannerMedia(
  catalog,
  {
    goal: "brand",
    regions: ["seoul"],
    categories: ["digital"],
    ageKeys: [],
    industryKey: null,
    budgetMan: 500,
    months: 1,
  },
  10,
  0,
);
assert.ok(
  recs.some((r) => r.media.catalogSource === "network"),
  "recommendPlannerMedia returns network in seoul+digital context",
);

const zeroRec = recommendPlannerMedia(
  catalog,
  {
    goal: "brand",
    regions: ["seoul"],
    categories: ["digital"],
    ageKeys: [],
    industryKey: null,
    budgetMan: 100,
    months: 1,
  },
  10,
  0,
);
assert.ok(
  zeroRec.some((r) => r.media.id.includes("zero-price")),
  "zero-price network stays in recommendations (no crash)",
);

console.log("test-planner-network-catalog: ok");

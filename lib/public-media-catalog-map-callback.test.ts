import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import type { Media } from "@prisma/client";
import { prismaMediaToMediaItem } from "./public-media-catalog.ts";

/** PR #423 regression: `.map(fn)` passes array index as 2nd arg when fn has optional params. */
const MAP_CALLBACK_DENY = /\.map\(prismaMediaToMediaItem\)/;

const LIB_SCAN_PATHS = [
  "public-media-catalog.ts",
  "public-media-map-catalog.ts",
  "media-package-db.ts",
];

function minimalMedia(
  overrides: Partial<Media> & {
    computedMetric?: {
      coverageDongs: unknown;
      coveragePopulation: number | null;
      demoGenderSplit: unknown;
      demoAgeSplit: unknown;
      demoSourceSignalIds: string[];
    };
  },
): Parameters<typeof prismaMediaToMediaItem>[0] {
  return {
    id: "m-cov",
    slug: "m-cov",
    name: "Coverage test",
    nameEn: null,
    location: "Seoul",
    country: "KR",
    region: "seoul",
    regionZone: null,
    type: "digital",
    price: 1000,
    pricePeriod: "month",
    priceOptions: null,
    partialPeriodRates: null,
    image: null,
    width: null,
    height: null,
    description: null,
    descriptionEn: null,
    locationEn: null,
    subCategory: null,
    mediaCategory: [],
    mediaMainCategory: null,
    mediaSubCategory: null,
    regionMain: "seoul",
    regionSub: null,
    targetCategory: [],
    tags: [],
    district: null,
    city: null,
    coverageDistrictCodes: [],
    latitude: 37.5665,
    longitude: 126.978,
    installLocations: null,
    dailyFootfall: 1000,
    operatingHours: null,
    effectMemo: null,
    nearbyFacilities: null,
    nearbyStations: null,
    nearbyLandmarks: null,
    widthM: null,
    heightM: null,
    visibilityScore: null,
    autoPopulatedAt: null,
    availability: "available",
    instantBookingEnabled: false,
    isActive: true,
    isFeatured: false,
    featuredOrder: null,
    isPopular: false,
    popularOrder: null,
    proposalUrl: null,
    proposalFileName: null,
    hasProposal: false,
    popularityScore: null,
    viewCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    advertiserExecutions: [],
    ...overrides,
  };
}

for (const rel of LIB_SCAN_PATHS) {
  test(`lib/${rel} must not use .map(prismaMediaToMediaItem)`, () => {
    const src = readFileSync(resolve(import.meta.dirname, rel), "utf8");
    assert.doesNotMatch(src, MAP_CALLBACK_DENY);
  });
}

test("prismaMediaToMediaItem: Array.map index as 2nd arg does not throw", () => {
  const rows = [
    minimalMedia({
      computedMetric: {
        coverageDongs: [{ code: "11010", weight: 1 }],
        coveragePopulation: 552631,
        demoGenderSplit: null,
        demoAgeSplit: null,
        demoSourceSignalIds: [],
      },
    }),
  ];
  assert.doesNotThrow(() => rows.map((row) => prismaMediaToMediaItem(row)));
  const [item] = rows.map((row) => prismaMediaToMediaItem(row));
  assert.equal(item.coveragePopulation, 552631);
});

test("prismaMediaToMediaItem: direct index arg ignored (Map guard)", () => {
  const row = minimalMedia({
    computedMetric: {
      coverageDongs: [{ code: "11010", weight: 1 }],
      coveragePopulation: 100,
      demoGenderSplit: null,
      demoAgeSplit: null,
      demoSourceSignalIds: [],
    },
  });
  const item = prismaMediaToMediaItem(row, 0 as never);
  assert.equal(item.coverageDongs, undefined);
  assert.equal(item.coveragePopulation, 100);
});

test("catalog map pipeline: batch rows with coverageDongs complete without throw", () => {
  const rows = Array.from({ length: 120 }, (_, i) =>
    minimalMedia({
      id: `m-${i}`,
      computedMetric: {
        coverageDongs: [{ code: "11010", weight: 1 }],
        coveragePopulation: 552631,
        demoGenderSplit: { male: 0.5, female: 0.5 },
        demoAgeSplit: { "20s": 0.2, "30s": 0.2 },
        demoSourceSignalIds: ["sig1"],
      },
    }),
  );
  const items = rows.map((row) => prismaMediaToMediaItem(row));
  assert.equal(items.length, 120);
  assert.ok(items.every((m) => m.coveragePopulation === 552631));
});

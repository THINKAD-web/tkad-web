import assert from "node:assert/strict";
import test from "node:test";
import type { Media } from "@prisma/client";
import { prismaMediaToMediaItem } from "./public-media-catalog.ts";

function baseMedia(overrides: Partial<Media> = {}): Media {
  return {
    id: "m1",
    slug: "m1",
    name: "Test",
    nameEn: null,
    location: "Tokyo",
    country: "JP",
    region: "jp",
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
    subCategory: null,
    mediaCategory: [],
    mediaMainCategory: null,
    mediaSubCategory: null,
    regionMain: null,
    regionSub: null,
    targetCategory: [],
    tags: [],
    district: null,
    city: null,
    coverageDistrictCodes: [],
    latitude: 35.6595,
    longitude: 139.7004,
    installLocations: null,
    priceNote: null,
    widthM: null,
    heightM: null,
    resolution: null,
    operatingHours: null,
    dailyFootfall: null,
    weekdayFootfall: null,
    targetAge: null,
    impressions: null,
    reach: null,
    frequency: null,
    cpm: null,
    engagementRate: null,
    visibilityScore: 0,
    installYear: null,
    effectMemo: null,
    trafficPattern: null,
    extractedImages: [],
    pastAdvertisers: null,
    nearbyFacilities: null,
    nearbyStations: null,
    nearbyLandmarks: null,
    addressVerified: false,
    isVerified: false,
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
    ...overrides,
  };
}

test("prismaMediaToMediaItem: overseas skips Seoul fallback", () => {
  const item = prismaMediaToMediaItem({
    ...baseMedia({ latitude: null, longitude: null }),
    advertiserExecutions: [],
  });
  assert.equal(item.lat, 0);
  assert.equal(item.lng, 0);
  assert.equal(item.coordinatesAreFallback, false);
});

test("prismaMediaToMediaItem: KR keeps Seoul fallback", () => {
  const item = prismaMediaToMediaItem({
    ...baseMedia({ country: "KR", latitude: null, longitude: null }),
    advertiserExecutions: [],
  });
  assert.ok(Math.abs(item.lat! - 37.5665) < 0.001);
  assert.ok(Math.abs(item.lng! - 126.978) < 0.001);
  assert.equal(item.coordinatesAreFallback, true);
});

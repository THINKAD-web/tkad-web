/**
 * Network location enrich unit checks (no DB).
 * Usage: npx tsx scripts/test-network-location-enrich.mts
 */
import assert from "node:assert/strict";
import {
  enrichNetworkLocation,
  normalizeBrowseRegionMainId,
  resolveBrowseRegionIds,
  resolveNetworkRegionsArray,
} from "../lib/network-location-enrich.ts";
import { prismaNetworkToMediaItem } from "../lib/media-network-public.ts";
import type { MediaNetworkWithLocs } from "../lib/media-network-public.ts";

assert.equal(normalizeBrowseRegionMainId("서울"), "seoul");
assert.equal(normalizeBrowseRegionMainId("seoul"), "seoul");

const gangnam = resolveBrowseRegionIds({
  address: "서울특별시 강남구 강남대로 396",
});
assert.ok(gangnam.regionMain === "seoul", `main=${gangnam.regionMain}`);
assert.ok(gangnam.regionSub?.includes("gangnam"), `sub=${gangnam.regionSub}`);

const enriched = enrichNetworkLocation({
  name: "교보문고 광화문점",
  address: "서울 종로구 종로 1",
});
assert.ok(enriched.regionMain, "regionMain filled");
assert.ok(enriched.regionSub, "regionSub filled");

const regions = resolveNetworkRegionsArray(undefined, [enriched]);
assert.ok(regions.includes("서울"), `regions=${regions.join(",")}`);

const mockNetwork: MediaNetworkWithLocs = {
  id: "test",
  name: "교보문고 디앱스",
  nameEn: null,
  description: null,
  type: "digital",
  pricePerUnit: 1000,
  pricePackage: null,
  priceNote: null,
  minUnits: 1,
  totalLocations: 1,
  regions: ["서울"],
  city: null,
  district: null,
  image: null,
  galleryImages: [],
  features: null,
  packageOptions: null,
  visibilityScore: 80,
  dailyFootfall: 10000,
  targetAge: null,
  effectMemo: null,
  operatingHours: null,
  tags: ["venue:bookstore"],
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  locations: [
    {
      id: "loc1",
      networkId: "test",
      mediaId: null,
      name: "광화문점",
      address: "서울 종로구 종로 1",
      fullAddress: "서울 종로구 종로 1",
      regionMain: enriched.regionMain,
      regionSub: enriched.regionSub,
      unitCount: 1,
      latitude: 37.57,
      longitude: 126.98,
      priceNote: null,
      dailyFootfall: 5000,
      note: null,
      createdAt: new Date(),
    },
  ],
};

const item = prismaNetworkToMediaItem(mockNetwork);
assert.equal(item.mediaMainCategory, "digital");
assert.equal(item.mediaSubCategory, "bookstore");
assert.equal(item.subCategory, "bookstore");
assert.equal(item.regionMain, "seoul");

console.log("test-network-location-enrich.mts: all passed");

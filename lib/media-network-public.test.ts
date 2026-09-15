import assert from "node:assert/strict";
import test from "node:test";
import {
  inferRegionCodeFromLabels,
  isNetworkNationwide,
  prismaNetworkToMediaItem,
  type MediaNetworkWithLocs,
} from "./media-network-public.ts";
import { matchesBrowseRegion } from "./media-discovery-client-filter.ts";
import { filterMediaByDiscoveryChips } from "./media-discovery-client-filter.ts";

const KYOBO_REGIONS = [
  "서울",
  "경기",
  "인천",
  "대구",
  "대전",
  "세종",
  "충남",
  "부산",
  "울산",
  "경남",
  "광주",
  "전국",
];

function kyoboNetwork(): MediaNetworkWithLocs {
  return {
    id: "cmqfeoaaw000m04ldn89jxwcu",
    name: "교보문고 디앱스 영상보드광고",
    nameEn: null,
    type: "bookstore",
    regions: KYOBO_REGIONS,
    regionMain: "seoul",
    regionSub: "seoul_cbd",
    city: null,
    district: null,
    image: null,
    galleryImages: [],
    tags: [],
    description: null,
    features: null,
    pricePackage: 1_000_000,
    pricePerUnit: null,
    minUnits: 1,
    packageOptions: null,
    dailyFootfall: null,
    totalLocations: 32,
    visibilityScore: null,
    targetAge: null,
    operatingHours: null,
    priceNote: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    locations: [
      {
        id: "loc1",
        networkId: "cmqfeoaaw000m04ldn89jxwcu",
        name: "교보문고 광주점",
        address: "광주광역시 동구",
        fullAddress: "광주광역시 동구",
        regionMain: "gwangju",
        regionSub: "gwangju_downtown",
        latitude: null,
        longitude: null,
        unitCount: 1,
        dailyFootfall: null,
        priceNote: null,
        note: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "loc2",
        networkId: "cmqfeoaaw000m04ldn89jxwcu",
        name: "교보문고 부산점",
        address: "부산광역시",
        fullAddress: "부산광역시",
        regionMain: "busan",
        regionSub: "busan_seomyeon",
        latitude: null,
        longitude: null,
        unitCount: 1,
        dailyFootfall: null,
        priceNote: null,
        note: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  } as MediaNetworkWithLocs;
}

test("isNetworkNationwide — 교보문고 다권역", () => {
  assert.equal(isNetworkNationwide(kyoboNetwork()), true);
});

test("inferRegionCodeFromLabels — 전국·다권역 labels → national", () => {
  assert.equal(inferRegionCodeFromLabels(KYOBO_REGIONS), "national");
  assert.equal(inferRegionCodeFromLabels(["부산", "서울"]), "national");
  assert.equal(inferRegionCodeFromLabels(["부산"]), "busan");
});

test("prismaNetworkToMediaItem — nationwide network gets regionMain=national", () => {
  const item = prismaNetworkToMediaItem(kyoboNetwork());
  assert.equal(item.regionMain, "national");
  assert.equal(item.region, "national");
  assert.equal(item.regionSub, undefined);
});

test("교보문고 — regionMain=busan/seoul/all discovery filter", () => {
  const item = prismaNetworkToMediaItem(kyoboNetwork());

  assert.equal(matchesBrowseRegion(item, "busan", "", ""), true);
  assert.equal(matchesBrowseRegion(item, "seoul", "", ""), true);
  assert.equal(
    matchesBrowseRegion(item, "seoul", "seoul_gangnam", ""),
    false,
  );

  const busanHits = filterMediaByDiscoveryChips([item], {
    query: "교보문고",
    regionMain: "busan",
  });
  assert.equal(busanHits.length, 1);

  const seoulHits = filterMediaByDiscoveryChips([item], {
    query: "교보문고",
    regionMain: "seoul",
  });
  assert.equal(seoulHits.length, 1);
});

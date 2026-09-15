import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "@/lib/media-data";
import { resolvePlanCartItemRegionKey } from "./regional-breakdown.ts";

function media(
  o: Partial<MediaItem> & Pick<MediaItem, "id">,
): MediaItem {
  return {
    name: o.id,
    nameEn: o.id,
    location: "",
    locationEn: "",
    region: "seoul",
    type: "mobile",
    price: 0,
    lat: 0,
    lng: 0,
    dailyFootTraffic: 0,
    sampleImages: [],
    ...o,
  } as MediaItem;
}

const TAXI_MEDIABAR = media({
  id: "taxi-mediabar",
  name: "택시 미디어바 광고",
  region: "national",
  regionMain: "national",
  location: "서울·경기·부산·포항·제주 전역 택시 노선",
  coverageDistrictCodes: ["11110", "26110", "41111", "47111", "50110"],
});

test("resolvePlanCartItemRegionKey — regionMain=national stays national", () => {
  assert.equal(resolvePlanCartItemRegionKey("seoul", TAXI_MEDIABAR), "national");
  assert.equal(resolvePlanCartItemRegionKey("", TAXI_MEDIABAR), "national");
});

test("resolvePlanCartItemRegionKey — single-region seoul media unchanged", () => {
  const seoulOnly = media({
    id: "seoul-billboard",
    region: "seoul",
    regionMain: "seoul",
    location: "서울 강남구",
  });
  assert.equal(resolvePlanCartItemRegionKey("", seoulOnly), "seoul");
});

test("resolvePlanCartItemRegionKey — legacy seoul region with national regionMain", () => {
  const legacy = media({
    id: "moving-flex",
    region: "seoul",
    regionMain: "national",
    location: "서울특별시 영등포구 선유로 265",
    coverageDistrictCodes: ["11110", "11680"],
  });
  assert.equal(resolvePlanCartItemRegionKey("seoul", legacy), "national");
});

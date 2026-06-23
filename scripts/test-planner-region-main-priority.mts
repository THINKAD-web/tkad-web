/**
 * Planner region: regionMain 우선 매칭·라벨·mapDistrictToRegionZone 회귀.
 * Run: npx tsx scripts/test-planner-region-main-priority.mts
 */
import assert from "node:assert/strict";
import type { MediaItem } from "../lib/media-data.ts";
import {
  legacyRegionConflictsWithRegionMain,
  matchesPlannerRegion,
  mediaPlannerRegionDisplayLabel,
} from "../lib/planner/planner-regions.ts";
import { mapDistrictToRegionZone } from "../lib/media-regions.ts";
import { matchMediaCatalog } from "../lib/matching-engine.ts";

function mockMedia(partial: Partial<MediaItem> & { id: string }): MediaItem {
  return {
    name: partial.name ?? partial.id,
    location: partial.location ?? "",
    type: "digital",
    price: 3_000_000,
    dailyFootTraffic: 50_000,
    ...partial,
  } as MediaItem;
}

const daeguPolluted = mockMedia({
  id: "daegu-banwoldang",
  name: "대구 반월당역 사각기둥 광고",
  location: "대구광역시 중구 달구벌대로 지하 2100",
  city: "대구",
  district: "중구",
  region: "seoul",
  regionMain: "daegu",
  regionSub: "daegu_downtown",
});

assert.equal(
  legacyRegionConflictsWithRegionMain("seoul", "daegu"),
  true,
  "legacy seoul conflicts with regionMain daegu",
);
assert.equal(
  !matchesPlannerRegion(daeguPolluted, "seoul"),
  true,
  "daegu media must not match seoul filter",
);
assert.equal(
  matchesPlannerRegion(daeguPolluted, "daegu"),
  true,
  "daegu media matches daegu filter",
);
assert.equal(
  matchesPlannerRegion(daeguPolluted, "gyeonggi"),
  false,
  "daegu media does not match gyeonggi",
);

const seoulMedia = mockMedia({
  id: "seoul-gangnam",
  name: "강남역 미디어폴",
  location: "서울특별시 강남구",
  city: "서울",
  district: "강남구",
  region: "seoul",
  regionMain: "seoul",
  regionSub: "seoul_gangnam",
});
assert.equal(
  matchesPlannerRegion(seoulMedia, "seoul"),
  true,
  "seoul media still matches seoul",
);

const gyeonggiMedia = mockMedia({
  id: "gyeonggi-pangyo",
  name: "판교 빌보드",
  location: "경기 성남시 분당구",
  city: "성남",
  region: "national",
  regionMain: "gyeonggi",
});
assert.equal(
  matchesPlannerRegion(gyeonggiMedia, "gyeonggi"),
  true,
  "gyeonggi media matches gyeonggi",
);
assert.equal(
  matchesPlannerRegion(gyeonggiMedia, "seoul"),
  false,
  "gyeonggi media does not match seoul",
);

const label = mediaPlannerRegionDisplayLabel(daeguPolluted, "ko");
assert.ok(label.startsWith("대구"), `label should start with 대구, got: ${label}`);
assert.ok(!label.startsWith("서울"), `label must not start with 서울: ${label}`);

assert.equal(
  mapDistrictToRegionZone("중구", { city: "대구", location: "대구광역시 중구" }),
  "daegu",
  "대구 중구 must not map to seoul downtown",
);
assert.equal(
  mapDistrictToRegionZone("중구", { city: "서울", location: "서울특별시 중구" }),
  "downtown",
  "서울 중구 maps to downtown",
);
assert.equal(
  mapDistrictToRegionZone("중구", {
    location: "대구광역시 중구 달구벌대로",
  }),
  "daegu",
  "location-only 대구 중구 maps to daegu",
);

const results = matchMediaCatalog(
  [daeguPolluted, seoulMedia],
  {
    monthlyBudgetWon: 5_000_000,
    regions: ["seoul", "gyeonggi"],
    industry: "other",
    targets: [],
    durationMonths: 1,
    goal: "brand",
  },
  10,
);
const daeguRow = results.find((s) => s.media.id === "daegu-banwoldang");
const seoulRow = results.find((s) => s.media.id === "seoul-gangnam");
assert.equal(
  daeguRow?.breakdown.region ?? 0,
  0,
  "polluted daegu must not get region score from legacy seoul",
);
assert.ok(
  (seoulRow?.breakdown.region ?? 0) >= 15,
  "seoul media keeps regional score",
);

console.log("test-planner-region-main-priority: ok");

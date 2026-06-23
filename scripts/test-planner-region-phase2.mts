/**
 * Planner region phase 2: API hard filter + national policy.
 * Run: npx tsx scripts/test-planner-region-phase2.mts
 */
import assert from "node:assert/strict";
import type { MediaItem } from "../lib/media-data.ts";
import {
  filterCatalogByPlannerRegions,
  isNationwideBrowseMedia,
  legacyRegionConflictsWithRegionMain,
  matchesPlannerRegion,
  mediaPlannerRegionDisplayLabel,
} from "../lib/planner/planner-regions.ts";
import { recommendPlannerMedia } from "../lib/planner/recommend.ts";

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

const gyeongju = mockMedia({
  id: "ktx-gyeongju",
  name: "KTX 경주역 LED전광판 광고",
  location: "경북 경주시",
  city: "경북",
  region: "national",
  regionMain: "gyeongsang",
});

const osong = mockMedia({
  id: "ktx-osong",
  name: "KTX 오송역 LED 영상광고",
  region: "national",
  regionMain: "chungcheong",
  city: "충북",
  location: "오송역",
});

const nationwide = mockMedia({
  id: "ktx-car",
  name: "KTX 차내 영상 광고",
  region: "national",
  regionMain: "national",
  city: "전국",
  location: "전국",
});

const seoul = mockMedia({
  id: "seoul-ktx",
  name: "KTX 서울역",
  region: "seoul",
  regionMain: "seoul",
  city: "서울",
  location: "서울역",
});

assert.equal(
  legacyRegionConflictsWithRegionMain("national", "gyeongsang"),
  true,
  "legacy national conflicts with regional regionMain",
);

assert.equal(!matchesPlannerRegion(gyeongju, "national"), true);
assert.equal(!matchesPlannerRegion(gyeongju, "seoul"), true);
assert.equal(matchesPlannerRegion(gyeongju, "gyeongsang"), true);
assert.equal(matchesPlannerRegion(nationwide, "national"), true);
assert.equal(!matchesPlannerRegion(osong, "national"), true);
assert.equal(matchesPlannerRegion(seoul, "seoul"), true);

assert.equal(isNationwideBrowseMedia(nationwide), true);
assert.equal(isNationwideBrowseMedia(gyeongju), false);

const gyeongjuLabel = mediaPlannerRegionDisplayLabel(
  gyeongju,
  "ko",
  "전국 패키지",
);
assert.ok(
  gyeongjuLabel.includes("경상"),
  `gyeongju label should be regional, got: ${gyeongjuLabel}`,
);
assert.ok(
  !gyeongjuLabel.includes("전국 패키지"),
  `gyeongju must not show nationwide package label`,
);

const nationwideLabel = mediaPlannerRegionDisplayLabel(
  nationwide,
  "ko",
  "전국 패키지",
);
assert.equal(nationwideLabel, "전국 패키지");

const catalog = [gyeongju, osong, nationwide, seoul];
const seoulFiltered = filterCatalogByPlannerRegions(catalog, ["seoul"]);
assert.deepEqual(
  seoulFiltered.map((m) => m.id),
  ["seoul-ktx"],
  "seoul hard filter excludes gyeongju/osong/nationwide",
);

const nationalFiltered = filterCatalogByPlannerRegions(catalog, ["national"]);
assert.deepEqual(
  nationalFiltered.map((m) => m.id),
  ["ktx-car"],
  "national filter only true nationwide",
);

const recs = recommendPlannerMedia(
  catalog,
  {
    goal: "brand",
    regions: ["seoul"],
    categories: ["digital"],
    ageKeys: [],
    industryKey: null,
    budgetMan: 5000,
    months: 3,
  },
  5,
  0,
);
assert.ok(
  recs.every((r) => r.media.id === "seoul-ktx"),
  "client recommend prefilter keeps seoul only",
);

console.log("test-planner-region-phase2: ok");

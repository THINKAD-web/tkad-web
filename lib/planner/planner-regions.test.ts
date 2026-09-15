import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "@/lib/media-data";
import { matchesPlannerRegion } from "./planner-regions.ts";

function media(o: Partial<MediaItem> & Pick<MediaItem, "id">): MediaItem {
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

test("matchesPlannerRegion — national regionMain matches any browse region", () => {
  const nationwide = media({
    id: "taxi",
    regionMain: "national",
    region: "national",
  });
  assert.equal(matchesPlannerRegion(nationwide, "national"), true);
  assert.equal(matchesPlannerRegion(nationwide, "seoul"), true);
  assert.equal(matchesPlannerRegion(nationwide, "busan"), true);
  assert.equal(matchesPlannerRegion(nationwide, "jeju"), true);
});

test("matchesPlannerRegion — seoul-only media does not match busan", () => {
  const seoulOnly = media({
    id: "bb",
    regionMain: "seoul",
    region: "seoul",
    location: "서울 강남",
  });
  assert.equal(matchesPlannerRegion(seoulOnly, "seoul"), true);
  assert.equal(matchesPlannerRegion(seoulOnly, "busan"), false);
});

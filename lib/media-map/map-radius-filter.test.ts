import assert from "node:assert/strict";
import { mediaItemWithinRadiusM, parseMapRadiusM } from "./map-radius-filter";
import type { MediaItem } from "@/lib/media-data";

const pinNearGangnam: MediaItem = {
  id: "test-pin",
  name: "Test",
  type: "dooh",
  lat: 37.4979,
  lng: 127.0276,
  price: 1,
  pricePeriod: "month",
  region: "seoul",
  city: "서울",
  district: "강남구",
  location: "강남",
  slug: "test",
  catalogChannel: "offline",
};

assert.equal(parseMapRadiusM("1000"), 1000);
assert.equal(parseMapRadiusM("bad"), null);

assert.equal(
  mediaItemWithinRadiusM(
    pinNearGangnam,
    { lat: 37.498, lng: 127.028 },
    500,
  ),
  true,
);

assert.equal(
  mediaItemWithinRadiusM(
    pinNearGangnam,
    { lat: 37.5665, lng: 126.978 },
    500,
  ),
  false,
);

console.log("map-radius-filter.test.ts: ok");

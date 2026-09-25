import assert from "node:assert/strict";
import {
  buildMediaMapSearchString,
  parseMediaMapUrlState,
} from "@/lib/media-map/url-state";

assert.deepEqual(parseMediaMapUrlState(new URLSearchParams("")), {});

const roundTrip = parseMediaMapUrlState(
  new URLSearchParams(
    buildMediaMapSearchString({
      lat: 37.5665,
      lng: 126.978,
      zoom: 9,
      q: "강남",
      regionMain: "seoul",
      priceMin: "100",
      media: "gangnam-billboard-a",
    }),
  ),
);
assert.equal(roundTrip.lat, 37.5665);
assert.equal(roundTrip.lng, 126.978);
assert.equal(roundTrip.zoom, 9);
assert.equal(roundTrip.q, "강남");
assert.equal(roundTrip.regionMain, "seoul");
assert.equal(roundTrip.priceMin, "100");
assert.equal(roundTrip.media, "gangnam-billboard-a");

assert.deepEqual(
  parseMediaMapUrlState(new URLSearchParams("lat=999&lng=50&zoom=99")),
  { zoom: 14 },
);

assert.equal(
  parseMediaMapUrlState(new URLSearchParams("type=digital")).category,
  "dooh",
);

const radius = parseMediaMapUrlState(
  new URLSearchParams(
    buildMediaMapSearchString({
      centerLat: 37.5,
      centerLng: 127.0,
      radiusM: 1000,
      placeLabel: "강남역",
    }),
  ),
);
assert.equal(radius.centerLat, 37.5);
assert.equal(radius.radiusM, 1000);
assert.equal(radius.placeLabel, "강남역");

console.log("url-state.test.ts: ok");

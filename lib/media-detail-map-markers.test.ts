import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "./media-data.ts";
import { mapMarkersForMediaDetail } from "./media-detail-map-markers.ts";

const kumho: MediaItem = {
  id: "cmp3uwie0000204lbw1zmrp2l",
  name: "금호 고속버스 외부 광고",
  nameEn: "Kumho express bus exterior",
  location: "전국 금호고속버스 노선",
  locationEn: "Nationwide Kumho routes",
  region: "national",
  regionMain: "national",
  type: "mobile",
  price: 1,
  lat: 36.414177,
  lng: 127.640163,
  dailyFootTraffic: 120_000,
  sampleImages: [],
};

const gangnamLed: MediaItem = {
  ...kumho,
  id: "led-1",
  name: "강남 전광판",
  type: "digital",
  region: "seoul",
  regionMain: "seoul",
  lat: 37.501,
  lng: 127.026,
};

test("mapMarkersForMediaDetail — 금호 고속버스(mobile) 핀 0개", () => {
  assert.deepEqual(mapMarkersForMediaDetail(kumho, true), []);
});

test("mapMarkersForMediaDetail — 고정 디지털은 핀 유지", () => {
  const pins = mapMarkersForMediaDetail(gangnamLed, true);
  assert.equal(pins.length, 1);
  assert.equal(pins[0]!.lat, 37.501);
  assert.equal(pins[0]!.lng, 127.026);
});

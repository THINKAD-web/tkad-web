import test from "node:test";
import assert from "node:assert/strict";
import {
  mapBoundsChangeExceedsThreshold,
  mapBoundsViewportChangeRatio,
} from "./map-bounds-change.ts";
import type { MapBounds } from "@/components/public-map/map-types";

const SEOUL: MapBounds = {
  swLat: 37.45,
  swLng: 126.85,
  neLat: 37.65,
  neLng: 127.15,
};

test("mapBoundsViewportChangeRatio — identical bounds → 0", () => {
  assert.equal(mapBoundsViewportChangeRatio(SEOUL, SEOUL), 0);
  assert.equal(mapBoundsChangeExceedsThreshold(SEOUL, SEOUL), false);
});

test("mapBoundsViewportChangeRatio — small pan stays below 10%", () => {
  const nudged: MapBounds = {
    swLat: SEOUL.swLat + 0.002,
    swLng: SEOUL.swLng + 0.002,
    neLat: SEOUL.neLat + 0.002,
    neLng: SEOUL.neLng + 0.002,
  };
  const ratio = mapBoundsViewportChangeRatio(SEOUL, nudged);
  assert.ok(ratio < 0.1, `expected < 0.1, got ${ratio}`);
  assert.equal(mapBoundsChangeExceedsThreshold(SEOUL, nudged), false);
});

test("mapBoundsViewportChangeRatio — large pan exceeds 10%", () => {
  const shifted: MapBounds = {
    swLat: SEOUL.swLat + 0.08,
    swLng: SEOUL.swLng,
    neLat: SEOUL.neLat + 0.08,
    neLng: SEOUL.neLng,
  };
  const ratio = mapBoundsViewportChangeRatio(SEOUL, shifted);
  assert.ok(ratio >= 0.1, `expected >= 0.1, got ${ratio}`);
  assert.equal(mapBoundsChangeExceedsThreshold(SEOUL, shifted), true);
});

test("mapBoundsViewportChangeRatio — zoom in triggers refresh", () => {
  const zoomedIn: MapBounds = {
    swLat: 37.52,
    swLng: 126.95,
    neLat: 37.58,
    neLng: 127.05,
  };
  assert.equal(mapBoundsChangeExceedsThreshold(SEOUL, zoomedIn), true);
});

test("mapBoundsViewportChangeRatio — disjoint bounds → 1", () => {
  const busan: MapBounds = {
    swLat: 35.05,
    swLng: 128.9,
    neLat: 35.25,
    neLng: 129.2,
  };
  assert.equal(mapBoundsViewportChangeRatio(SEOUL, busan), 1);
  assert.equal(mapBoundsChangeExceedsThreshold(SEOUL, busan), true);
});

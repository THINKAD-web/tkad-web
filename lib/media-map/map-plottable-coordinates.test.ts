import test from "node:test";
import assert from "node:assert/strict";
import {
  isCatalogFallbackCoordinate,
  mediaItemHasPlottableMapCoordinates,
  mediaItemLocationUnknown,
} from "./map-plottable-coordinates.ts";

test("isCatalogFallbackCoordinate — 서울시청 기본값", () => {
  assert.equal(isCatalogFallbackCoordinate(37.5665, 126.978), true);
  assert.equal(isCatalogFallbackCoordinate(37.5666, 126.978), false);
});

test("mediaItemHasPlottableMapCoordinates — coordinatesAreFallback 제외", () => {
  assert.equal(
    mediaItemHasPlottableMapCoordinates({
      lat: 37.5665,
      lng: 126.978,
      coordinatesAreFallback: true,
    }),
    false,
  );
  assert.equal(
    mediaItemLocationUnknown({
      lat: 37.5665,
      lng: 126.978,
      coordinatesAreFallback: true,
    }),
    true,
  );
});

test("mediaItemHasPlottableMapCoordinates — installLocations 유효 시 표시", () => {
  assert.equal(
    mediaItemHasPlottableMapCoordinates({
      lat: 37.5665,
      lng: 126.978,
      coordinatesAreFallback: true,
      installLocations: [{ label: "A", lat: 37.55, lng: 127.0, location: "x" }],
    }),
    true,
  );
});

test("mediaItemHasPlottableMapCoordinates — 실좌표", () => {
  assert.equal(
    mediaItemHasPlottableMapCoordinates({
      lat: 37.5512,
      lng: 126.9882,
      coordinatesAreFallback: false,
    }),
    true,
  );
});

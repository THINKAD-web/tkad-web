import assert from "node:assert/strict";
import test from "node:test";
import {
  mapViewCommandToDarkProgrammaticView,
  markerLatLngBounds,
  mediaDetailUsesLeafletMap,
} from "./media-detail-map-engine.ts";

test("mediaDetailUsesLeafletMap — KR stays Kakao, JP uses Leaflet", () => {
  assert.equal(mediaDetailUsesLeafletMap("KR"), false);
  assert.equal(mediaDetailUsesLeafletMap(undefined), false);
  assert.equal(mediaDetailUsesLeafletMap("JP"), true);
  assert.equal(mediaDetailUsesLeafletMap("US"), true);
});

test("markerLatLngBounds — two Tokyo pins", () => {
  const b = markerLatLngBounds([
    { lat: 35.659, lng: 139.699 },
    { lat: 35.661, lng: 139.701 },
  ]);
  assert.ok(b);
  assert.equal(b!.swLat, 35.659);
  assert.equal(b!.neLng, 139.701);
});

test("mapViewCommandToDarkProgrammaticView — focusMarker", () => {
  const v = mapViewCommandToDarkProgrammaticView(
    { type: "focusMarker", lat: 35.66, lng: 139.7, level: 4, nonce: 3 },
    [],
  );
  assert.deepEqual(v, {
    lat: 35.66,
    lng: 139.7,
    zoom: 4,
    nonce: 3,
  });
});

test("mapViewCommandToDarkProgrammaticView — fitMarkers uses bounds", () => {
  const v = mapViewCommandToDarkProgrammaticView(
    { type: "fitMarkers", nonce: 2 },
    [
      { lat: 35.65, lng: 139.69 },
      { lat: 35.67, lng: 139.71 },
    ],
  );
  assert.equal(v?.nonce, 2);
  assert.ok(v?.fitBounds);
  assert.equal(v!.fitBounds!.swLat, 35.65);
});

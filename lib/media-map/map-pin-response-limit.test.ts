import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyMapPinResponseLimit,
  resolveMapPinLimitForZoom,
} from "./map-pin-response-limit.ts";
import type { MediaItem } from "@/lib/media-data";

function pin(id: string, lat: number, lng: number): MediaItem {
  return {
    id,
    slug: id,
    name: id,
    type: "digital",
    location: "Seoul",
    region: "seoul",
    price: 1_000_000,
    pricePeriod: "month",
    lat,
    lng,
    tags: [],
  } as MediaItem;
}

test("resolveMapPinLimitForZoom — overview vs zoom-in", () => {
  assert.equal(resolveMapPinLimitForZoom(12), 50);
  assert.equal(resolveMapPinLimitForZoom(8), 80);
  assert.equal(resolveMapPinLimitForZoom(4), 150);
  assert.equal(resolveMapPinLimitForZoom(null), 80);
});

test("applyMapPinResponseLimit — truncates pins, keeps non-pin", () => {
  const pins = Array.from({ length: 60 }, (_, i) =>
    pin(`p${i}`, 37.5 + i * 0.001, 127.0 + i * 0.001),
  );
  const sorted = [
    pins[0]!,
    {
      ...pin("mobile", 0, 0),
      type: "mobile",
      lat: 0,
      lng: 0,
    } as MediaItem,
    ...pins.slice(1),
  ];
  const result = applyMapPinResponseLimit(sorted, {
    bounds: { swLat: 37, swLng: 126.5, neLat: 38, neLng: 127.5 },
    zoom: 12,
  });
  assert.equal(result.mapPlottableTotal, 60);
  assert.equal(result.mapPinsReturned, 50);
  assert.equal(result.mapPinsTruncated, true);
  assert.equal(result.items.length, 51);
  assert.ok(result.items.some((m) => m.id === "mobile"));
});

test("applyMapPinResponseLimit — no truncate under limit", () => {
  const sorted = [pin("a", 37.5, 127.0), pin("b", 37.51, 127.01)];
  const result = applyMapPinResponseLimit(sorted, {
    bounds: null,
    zoom: 8,
  });
  assert.equal(result.mapPinsTruncated, false);
  assert.equal(result.items.length, 2);
});

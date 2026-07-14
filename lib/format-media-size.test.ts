import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "@/lib/media-data";
import {
  formatSizeDisplay,
  formatSizeDisplayOptional,
  formatSizeFromMeters,
} from "@/lib/format-media-size";

function item(partial: Partial<MediaItem>): MediaItem {
  return partial as MediaItem;
}

test("formatSizeFromMeters uses m unit on each dimension", () => {
  assert.equal(formatSizeFromMeters(22.2, 30.5), "22.2m × 30.5m");
  assert.equal(formatSizeFromMeters(10, 8), "10m × 8m");
});

test("formatSizeDisplay prefers widthM/heightM over unitless size string", () => {
  const m = item({
    widthM: 22.2,
    heightM: 30.5,
    size: "22.2 × 30.5",
  });
  assert.equal(formatSizeDisplay(m), "22.2m × 30.5m");
});

test("formatSizeDisplayOptional returns undefined when no size data", () => {
  assert.equal(formatSizeDisplayOptional(item({})), undefined);
  assert.equal(formatSizeDisplay(item({})), "—");
});

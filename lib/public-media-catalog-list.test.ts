import assert from "node:assert/strict";
import test from "node:test";
import {
  catalogListItemsToMediaItems,
  mediaItemsToCatalogListItems,
} from "@/lib/media-catalog-list-dto";
import type { MediaItem } from "@/lib/media-data";

function stubMedia(overrides: Partial<MediaItem> = {}): MediaItem {
  return {
    id: "m1",
    name: "Test Media",
    nameEn: "Test Media",
    location: "Seoul",
    locationEn: "Seoul",
    region: "seoul",
    regionMain: "seoul",
    regionSub: "seoul_gangnam",
    mediaMainCategory: "ooh",
    mediaSubCategory: "billboard",
    type: "billboard",
    price: 1_000_000,
    lat: 37.5,
    lng: 127.0,
    dailyFootTraffic: 1000,
    sampleImages: [],
    description: "Detail-only body ".repeat(200),
    catalogDescription: "Also detail-only",
    trafficPattern: { hourly: Array(24).fill(1) },
    ...overrides,
  };
}

test("list DTO round-trip drops detail blobs but keeps filter fields", () => {
  const items = catalogListItemsToMediaItems(
    mediaItemsToCatalogListItems([stubMedia()]),
  );
  assert.equal(items.length, 1);
  const item = items[0]!;
  assert.equal(item.regionMain, "seoul");
  assert.equal(item.mediaSubCategory, "billboard");
  assert.equal(item.description, undefined);
  assert.equal(item.trafficPattern, undefined);
});

test("857-item slim JSON stays under 2MB Data Cache limit", () => {
  const items = catalogListItemsToMediaItems(
    mediaItemsToCatalogListItems(
      Array.from({ length: 857 }, (_, i) =>
        stubMedia({ id: `m${i}`, slug: `media-${i}` }),
      ),
    ),
  );
  const bytes = Buffer.byteLength(JSON.stringify(items));
  assert.ok(bytes < 2 * 1024 * 1024, `expected <2MB, got ${bytes} bytes`);
});

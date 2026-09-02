import assert from "node:assert/strict";
import test from "node:test";
import { buildBrowseFilterOptionCounts } from "./media-browse-filter-option-counts.ts";
import type { MediaItem } from "./media-data.ts";

function stubMedia(overrides: Partial<MediaItem> = {}): MediaItem {
  return {
    id: "m1",
    name: "Test",
    type: "billboard",
    price: 1_000_000,
    region: "서울",
    regionMain: "seoul",
    regionSub: "seoul_gangnam",
    mediaMainCategory: "ooh",
    mediaSubCategory: "billboard",
    mediaCategory: ["ooh", "billboard"],
    targetCategory: ["mass"],
    ...overrides,
  } as MediaItem;
}

test("buildBrowseFilterOptionCounts returns keys for taxonomy options", () => {
  const items = [
    stubMedia({ id: "a", regionSub: "seoul_gangnam", mediaSubCategory: "billboard" }),
    stubMedia({
      id: "b",
      regionSub: "seoul_hongdae",
      mediaSubCategory: "digital_signage",
      catalogSource: "network",
      type: "network",
    }),
  ];
  const counts = buildBrowseFilterOptionCounts(items);
  assert.ok(counts.mainCategory.ooh >= 1);
  assert.ok(counts.subCategory["ooh/billboard"] >= 1);
  assert.ok(counts.regionSub["seoul/seoul_gangnam"] >= 1);
  assert.equal(counts.networkFeature, 1);
});

test("buildBrowseFilterOptionCounts empty catalog yields zero networkFeature", () => {
  const counts = buildBrowseFilterOptionCounts([]);
  assert.equal(counts.networkFeature, 0);
  assert.equal(counts.mainCategory.search ?? 0, 0);
  assert.equal(Object.keys(counts.subCategory).length > 0, true);
  assert.equal(Object.keys(counts.regionSub).length > 0, true);
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  isDefaultMapBrowseFilters,
  mapBrowseFiltersFingerprint,
  resolveMapSearchType,
} from "./map-ga-events.ts";
import type { MapBrowseFilters } from "./media-map/browse-filters.ts";

const baseFilters = (): MapBrowseFilters => ({
  q: "",
  mainCategory: "",
  subCategory: "",
  target: "",
  regionMain: "",
  regionSub: "",
  priceMin: "",
  priceMax: "",
  features: "",
  sort: "popular",
});

test("mapBrowseFiltersFingerprint — stable key order and sorted features", () => {
  const a = mapBrowseFiltersFingerprint({
    ...baseFilters(),
    features: "network",
    q: " 강남 ",
  });
  const b = mapBrowseFiltersFingerprint({
    ...baseFilters(),
    features: "network",
    q: "강남",
  });
  assert.equal(a, b);
});

test("isDefaultMapBrowseFilters — empty browse state", () => {
  assert.equal(isDefaultMapBrowseFilters(baseFilters()), true);
  assert.equal(
    isDefaultMapBrowseFilters({ ...baseFilters(), regionMain: "서울" }),
    false,
  );
});

test("resolveMapSearchType — heuristics", () => {
  assert.equal(resolveMapSearchType(""), "media_name");
  assert.equal(resolveMapSearchType("123 테헤란로"), "address");
  assert.equal(resolveMapSearchType("강남역"), "poi");
  assert.equal(resolveMapSearchType("롯데타워"), "media_name");
});

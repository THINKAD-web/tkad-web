import assert from "node:assert/strict";
import test from "node:test";
import { compareDigitalCatalogItems } from "./catalog-compare-log.ts";
import type { DigitalCatalogItem } from "@/lib/planner/digital-catalog-types";

const base: DigitalCatalogItem = {
  slug: "naver-sa-traffic",
  nameKo: "네이버",
  channel: "NAVER_SA",
  platform: "Naver Search Ads",
  mediaType: "SA",
  cpcMin: 400,
  cpcMax: 1200,
  cpmMin: null,
  cpmMax: null,
};

test("compareDigitalCatalogItems — identical catalogs", () => {
  const result = compareDigitalCatalogItems([base], [{ ...base }]);
  assert.equal(result.fieldMismatches.length, 0);
  assert.equal(result.onlyLocalSlugs.length, 0);
  assert.equal(result.matchedSlugs, 1);
});

test("compareDigitalCatalogItems — field mismatch", () => {
  const remote = { ...base, cpcMin: 999 };
  const result = compareDigitalCatalogItems([base], [remote]);
  assert.equal(result.fieldMismatches.length, 1);
  assert.equal(result.fieldMismatches[0]?.field, "cpcMin");
});

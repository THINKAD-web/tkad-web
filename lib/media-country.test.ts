import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_MEDIA_COUNTRY,
  hasValidManualCoords,
  isKoreaMediaCountry,
  isPlannerEligibleCountry,
  mediaNameEnPlaceholder,
  normalizeMediaCountry,
  overseasRegionDefaults,
  applyOverseasMediaRegionFieldsOnSave,
} from "./media-country.ts";

test("normalizeMediaCountry defaults empty to KR", () => {
  assert.equal(normalizeMediaCountry(""), "KR");
  assert.equal(normalizeMediaCountry(undefined), "KR");
});

test("normalizeMediaCountry normalizes known codes", () => {
  assert.equal(normalizeMediaCountry("jp"), "JP");
  assert.equal(normalizeMediaCountry("US"), "US");
  assert.equal(normalizeMediaCountry("DE"), "OTHER");
});

test("planner eligibility is KR-only", () => {
  assert.equal(isKoreaMediaCountry("KR"), true);
  assert.equal(isPlannerEligibleCountry("KR"), true);
  assert.equal(isPlannerEligibleCountry("JP"), false);
});

test("overseasRegionDefaults uses overseas browse escape hatch", () => {
  const d = overseasRegionDefaults("JP");
  assert.equal(d.region, "jp");
  assert.equal(d.regionMain, "overseas");
  assert.equal(d.regionSub, "overseas");
});

test("applyOverseasMediaRegionFieldsOnSave clears stale region_zone", () => {
  const d = applyOverseasMediaRegionFieldsOnSave("JP");
  assert.equal(d.regionMain, "overseas");
  assert.equal(d.region, "jp");
  assert.equal(d.regionZone, null);
});

test("hasValidManualCoords rejects invalid coords", () => {
  assert.equal(hasValidManualCoords(null, 139.7), false);
  assert.equal(hasValidManualCoords(0, 0), false);
  assert.equal(hasValidManualCoords(35.6595, 139.7004), true);
});

test("mediaNameEnPlaceholder uses country-specific examples", () => {
  assert.match(mediaNameEnPlaceholder("JP", true), /Shibuya/);
  assert.match(mediaNameEnPlaceholder(DEFAULT_MEDIA_COUNTRY, false), /Gangnam/);
});

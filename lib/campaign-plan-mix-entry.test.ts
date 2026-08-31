import assert from "node:assert/strict";
import test from "node:test";
import {
  filterCatalogMixEntries,
  filterCustomMixEntries,
  isCatalogMixEntry,
  isCustomMixEntry,
  normalizeMediaMix,
  normalizeMixEntry,
  sumCustomMixTotalWon,
} from "./campaign-plan-mix-entry.ts";

const LEGACY_CATALOG_ROW = {
  mediaId: "m-city",
  name: "M-CITY",
  units: 2,
  days: 14,
  priceWon: 45_000_000,
  priceIsEstimate: false,
  impressions: 1_000_000,
  cpmWon: 45_000,
};

const CUSTOM_ROW = {
  kind: "custom" as const,
  lineId: "custom-abc123",
  name: "특수 협의 매체",
  quantity: 3,
  unitPriceWon: 500_000,
  days: 30,
  priceWon: 1_500_000,
};

test("normalizeMixEntry: kind 없는 legacy row → catalog", () => {
  const entry = normalizeMixEntry(LEGACY_CATALOG_ROW);
  assert.ok(entry);
  assert.equal(isCatalogMixEntry(entry!), true);
  assert.equal(entry!.mediaId, "m-city");
  assert.equal(entry!.units, 2);
});

test("normalizeMixEntry: custom row", () => {
  const entry = normalizeMixEntry(CUSTOM_ROW);
  assert.ok(entry);
  assert.equal(isCustomMixEntry(entry!), true);
  assert.equal(entry!.lineId, "custom-abc123");
  assert.equal(entry!.priceWon, 1_500_000);
});

test("normalizeMediaMix: legacy 배열만 catalog 로 복원", () => {
  const mix = normalizeMediaMix([LEGACY_CATALOG_ROW]);
  assert.equal(mix.length, 1);
  assert.equal(isCatalogMixEntry(mix[0]!), true);
});

test("normalizeMediaMix: catalog + custom 혼합", () => {
  const mix = normalizeMediaMix([LEGACY_CATALOG_ROW, CUSTOM_ROW]);
  assert.equal(filterCatalogMixEntries(mix).length, 1);
  assert.equal(filterCustomMixEntries(mix).length, 1);
});

test("normalizeMediaMix: invalid rows drop", () => {
  assert.deepEqual(normalizeMediaMix([null, {}, { kind: "custom" }]), []);
});

test("sumCustomMixTotalWon", () => {
  assert.equal(sumCustomMixTotalWon([CUSTOM_ROW]), 1_500_000);
});

test("custom priceWon 없으면 quantity × unitPriceWon", () => {
  const entry = normalizeMixEntry({
    kind: "custom",
    lineId: "custom-x",
    name: "X",
    quantity: 2,
    unitPriceWon: 100,
    days: 7,
  });
  assert.equal(entry?.priceWon, 200);
});

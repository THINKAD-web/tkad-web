import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "@/lib/media-data";
import {
  effectiveNetworkEntryMonthlyWon,
  plannerMediaMonthlyPriceMan,
} from "@/lib/matching-network-helpers";
import { catalogPriceFieldToPriceMan } from "@/lib/media-price-format";
import {
  getMediaPackageOptions,
  getQuantityBounds,
  getQuantityUnitMode,
  isQuantitySelectableMedia,
  MEDIA_QUANTITY_NETWORK_SOFT_MAX,
  resolveImpressionsForUnits,
  resolveMediaQuantity,
  resolveMonthlyPriceForUnits,
} from "@/lib/media-quantity";

function baseItem(overrides: Partial<MediaItem> = {}): MediaItem {
  return {
    id: "test-1",
    name: "Test",
    nameEn: "Test",
    location: "Seoul",
    locationEn: "Seoul",
    region: "seoul",
    type: "digital",
    price: 5_000_000,
    lat: 37.5,
    lng: 127,
    dailyFootTraffic: 10_000,
    ...overrides,
  };
}

const networkPerUnit = baseItem({
  id: "nw_bus",
  catalogSource: "network",
  type: "network",
  networkMinUnits: 10,
  networkPricePerUnit: 100_000,
  networkTotalLocations: 500,
  dailyFootTraffic: 1_000,
});

const networkTiers = baseItem({
  id: "nw_tier",
  catalogSource: "network",
  type: "network",
  networkMinUnits: 100,
  networkPackageTiers: [
    { units: 100, price: 5_000_000 },
    { units: 200, price: 9_000_000 },
  ],
  networkPricePerUnit: 60_000,
  dailyFootTraffic: 2_000,
});

const mobileSingle = baseItem({
  id: "mob-1",
  type: "mobile",
  price: 3_000_000,
  dailyFootTraffic: 500,
});

const fixedBillboard = baseItem({
  id: "bb-1",
  type: "static",
  price: 8_000_000,
  dailyFootTraffic: 20_000,
});

test("isQuantitySelectableMedia", () => {
  assert.equal(isQuantitySelectableMedia(networkPerUnit), true);
  assert.equal(isQuantitySelectableMedia(mobileSingle), true);
  assert.equal(isQuantitySelectableMedia(fixedBillboard), false);
});

test("getQuantityBounds", () => {
  assert.deepEqual(getQuantityBounds(networkPerUnit), {
    min: 10,
    max: 500,
    default: 10,
  });
  assert.deepEqual(getQuantityBounds(mobileSingle), {
    min: 1,
    max: null,
    default: 1,
  });
  assert.deepEqual(getQuantityBounds(fixedBillboard), {
    min: 1,
    max: 1,
    default: 1,
  });
});

test("network per-unit: min matches effectiveNetworkEntryMonthlyWon", () => {
  const min = getQuantityBounds(networkPerUnit).min;
  assert.equal(
    resolveMonthlyPriceForUnits(networkPerUnit, min),
    effectiveNetworkEntryMonthlyWon(networkPerUnit),
  );
  assert.equal(
    catalogPriceFieldToPriceMan(resolveMonthlyPriceForUnits(networkPerUnit, min)),
    plannerMediaMonthlyPriceMan(networkPerUnit),
  );
});

test("network per-unit: 2x units → 2x price", () => {
  const min = getQuantityBounds(networkPerUnit).min;
  const atMin = resolveMonthlyPriceForUnits(networkPerUnit, min);
  const atDouble = resolveMonthlyPriceForUnits(networkPerUnit, min * 2);
  assert.equal(atDouble, atMin * 2);
});

test("network tiers: tier snap and double tier", () => {
  const at100 = resolveMonthlyPriceForUnits(networkTiers, 100);
  assert.equal(at100, 5_000_000);
  const at200 = resolveMonthlyPriceForUnits(networkTiers, 200);
  assert.equal(at200, 9_000_000);
});

test("mobile single: price scales with units", () => {
  assert.equal(resolveMonthlyPriceForUnits(mobileSingle, 1), 3_000_000);
  assert.equal(resolveMonthlyPriceForUnits(mobileSingle, 3), 9_000_000);
});

test("fixed single: units ignored", () => {
  assert.equal(resolveMonthlyPriceForUnits(fixedBillboard, 1), 8_000_000);
  assert.equal(resolveMonthlyPriceForUnits(fixedBillboard, 50), 8_000_000);
});

test("resolveImpressionsForUnits", () => {
  const base = 1_000 * 30;
  assert.equal(resolveImpressionsForUnits(networkPerUnit, 10), base * 10);
  assert.equal(resolveImpressionsForUnits(mobileSingle, 4), 500 * 30 * 4);
  assert.equal(resolveImpressionsForUnits(fixedBillboard, 99), 20_000 * 30);
});

test("prime office: sample totalLocations does not cap unit stepper", () => {
  const prime = baseItem({
    id: "nw_prime",
    catalogSource: "network",
    type: "network",
    networkMinUnits: 1,
    networkTotalLocations: 3,
    networkPricePerUnit: 18_000,
    networkPackageTiers: [
      { units: 1, price: 18_000 },
      { units: 40, price: 0 },
    ],
    networkLocations: [
      { name: "A", address: "A", regionMain: "서울", unitCount: 1 },
      { name: "B", address: "B", regionMain: "서울", unitCount: 1 },
      { name: "C", address: "C", regionMain: "서울", unitCount: 1 },
    ],
  });
  assert.equal(getQuantityUnitMode(prime), "unit");
  assert.equal(getQuantityBounds(prime).max, MEDIA_QUANTITY_NETWORK_SOFT_MAX);
  assert.equal(resolveMediaQuantity(prime, 50), 50);
});

test("pharmacy network: package mode bounds from tiers", () => {
  const pharmacy = baseItem({
    id: "nw_ph",
    catalogSource: "network",
    type: "network",
    networkPackageTiers: [
      { units: 1, price: 30_000 },
      { units: 87, price: 3_000_000 },
    ],
  });
  assert.equal(getQuantityUnitMode(pharmacy), "package");
  assert.deepEqual(getQuantityBounds(pharmacy), {
    min: 1,
    max: 87,
    default: 1,
  });
});

test("G-bus style priceOptions → package mode", () => {
  const gbus = baseItem({
    id: "gbus",
    type: "mobile",
    price: 64_000_000,
    priceOptions: [
      { label: "3회/시간", price: 64_000_000 },
      { label: "1회/시간", price: 21_000_000 },
    ],
  });
  assert.equal(getQuantityUnitMode(gbus), "package");
  assert.equal(getMediaPackageOptions(gbus, true).length, 2);
  assert.equal(isQuantitySelectableMedia(gbus), true);
});

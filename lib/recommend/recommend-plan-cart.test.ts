import assert from "node:assert/strict";
import test from "node:test";
import type { PlanCartItem } from "@/lib/plan-cart";
import type { MediaItem } from "@/lib/media-data";
import { recommendPricingFromPlanCart } from "@/lib/recommend/recommend-plan-cart";
import { planCartLineMonthlyWon } from "@/lib/plan-cart-pricing";

const busMedia: MediaItem = {
  id: "bus-a",
  name: "서울 버스 A등급",
  nameEn: "Seoul Bus A",
  location: "서울",
  locationEn: "Seoul",
  region: "seoul",
  type: "mobile",
  price: 0,
  lat: 0,
  lng: 0,
  dailyFootTraffic: 0,
  sampleImages: [],
  priceOptions: [
    { label: "A", price: 800_000 },
    { label: "SSA", price: 1_200_000 },
  ],
};

const packageMedia: MediaItem = {
  id: "pkg-a",
  name: "패키지 매체",
  nameEn: "Package",
  location: "서울",
  locationEn: "Seoul",
  region: "seoul",
  type: "digital",
  price: 5_000_000,
  lat: 0,
  lng: 0,
  dailyFootTraffic: 0,
  sampleImages: [],
  priceOptions: [
    { label: "옵션1", price: 5_000_000 },
    { label: "옵션2", price: 8_000_000 },
  ],
};

function baseItem(overrides: Partial<PlanCartItem>): PlanCartItem {
  return {
    mediaId: "x",
    mediaName: "X",
    mediaType: "digital",
    region: "seoul",
    price: 0,
    addedFrom: "search",
    addedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

test("recommendPricingFromPlanCart sums gradeSelections", () => {
  const item = baseItem({
    mediaId: "bus-a",
    gradeSelections: [
      { priceOptionIndex: 0, quantity: 2 },
      { priceOptionIndex: 1, quantity: 3 },
    ],
  });
  const pricing = recommendPricingFromPlanCart(
    [item],
    new Set(["bus-a"]),
    [busMedia],
  );
  assert.equal(pricing.quantities["bus-a"], 5);
  assert.equal(pricing.priceOptionIndex["bus-a"], 0);
  assert.equal(planCartLineMonthlyWon(item, busMedia), 2 * 800_000 + 3 * 1_200_000);
});

test("recommendPricingFromPlanCart sums optionSelections for package media", () => {
  const item = baseItem({
    mediaId: "pkg-a",
    optionSelections: [
      { priceOptionIndex: 0, quantity: 2 },
      { priceOptionIndex: 1, quantity: 1 },
    ],
  });
  const pricing = recommendPricingFromPlanCart(
    [item],
    new Set(["pkg-a"]),
    [packageMedia],
  );
  assert.equal(pricing.quantities["pkg-a"], 3);
  assert.equal(pricing.priceOptionIndex["pkg-a"], 0);
  assert.equal(planCartLineMonthlyWon(item, packageMedia), 5_000_000 + 8_000_000);
});

test("recommendPricingFromPlanCart falls back to single quantity and priceOptionIndex", () => {
  const item = baseItem({
    mediaId: "pkg-a",
    quantity: 1,
    priceOptionIndex: 1,
  });
  const pricing = recommendPricingFromPlanCart(
    [item],
    new Set(["pkg-a"]),
    [packageMedia],
  );
  assert.equal(pricing.quantities["pkg-a"], 1);
  assert.equal(pricing.priceOptionIndex["pkg-a"], 1);
  assert.equal(planCartLineMonthlyWon(item, packageMedia), 8_000_000);
});

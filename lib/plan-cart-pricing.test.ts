import assert from "node:assert/strict";
import test from "node:test";
import type { PlanCart } from "@/lib/plan-cart";
import {
  planCartLineMonthlyWon,
  planCartMonthlyTotalWon,
  planCartPortfolioPricing,
} from "@/lib/plan-cart-pricing";
import type { MediaItem } from "@/lib/media-data";

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

test("planCartMonthlyTotalWon multiplies mobile single media price by quantity", () => {
  const cart: PlanCart = {
    items: [
      {
        mediaId: "taxi-1",
        mediaName: "택시",
        mediaType: "mobile",
        region: "seoul",
        price: 800_000,
        quantity: 3,
        addedFrom: "search",
        addedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
  assert.equal(planCartMonthlyTotalWon(cart), 2_400_000);
});

test("planCartMonthlyTotalWon uses grade unit rate × fleet count from catalog", () => {
  const cart: PlanCart = {
    items: [
      {
        mediaId: "bus-a",
        mediaName: "서울 버스 A등급",
        mediaType: "mobile",
        region: "seoul",
        price: 800_000,
        quantity: 50,
        priceOptionIndex: 0,
        addedFrom: "search",
        addedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
  assert.equal(planCartLineMonthlyWon(cart.items[0]!, busMedia), 40_000_000);
  assert.equal(planCartMonthlyTotalWon(cart, [busMedia]), 40_000_000);
});

test("planCartPortfolioPricing builds planner pricing maps from cart items", () => {
  const cart: PlanCart = {
    items: [
      {
        mediaId: "bus-a",
        mediaName: "Bus",
        mediaType: "mobile",
        region: "seoul",
        price: 800_000,
        quantity: 10,
        priceOptionIndex: 1,
        addedFrom: "planner",
        addedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
  assert.deepEqual(planCartPortfolioPricing(cart), {
    quantities: { "bus-a": 10 },
    priceOptionIndex: { "bus-a": 1 },
  });
});

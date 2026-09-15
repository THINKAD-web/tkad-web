import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "@/lib/media-data";
import type { PlanCart } from "@/lib/plan-cart";
import { buildPlanCartReportBundle } from "@/lib/plan-cart-report/build-report";

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

test("buildPlanCartReportBundle — budget follows cart line totals, not totalBudget meta", () => {
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
    totalBudget: 25_000_000,
    duration: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  const bundle = buildPlanCartReportBundle({
    cart,
    catalog: [busMedia],
    isKo: true,
  });

  assert.ok(bundle);
  assert.equal(bundle!.reportProps.budgetNum, 4_000);
  assert.equal(bundle!.reportProps.portfolioMonthlyTotalMan, 4_000);
  assert.deepEqual(bundle!.reportProps.campaignMediaQuantities, {
    "bus-a": 50,
  });
  assert.deepEqual(bundle!.reportProps.campaignMediaPriceOptionIndex, {
    "bus-a": 0,
  });
});

test("buildPlanCartReportBundle — passes cart pricing maps to report props", () => {
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

  const bundle = buildPlanCartReportBundle({
    cart,
    catalog: [busMedia],
    isKo: true,
  });

  assert.ok(bundle);
  assert.equal(bundle!.reportProps.campaignMediaQuantities?.["bus-a"], 10);
  assert.equal(bundle!.reportProps.campaignMediaPriceOptionIndex?.["bus-a"], 1);
  assert.equal(bundle!.reportProps.budgetNum, 1_200);
});

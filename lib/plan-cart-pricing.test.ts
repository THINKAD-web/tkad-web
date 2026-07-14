import assert from "node:assert/strict";
import test from "node:test";
import type { PlanCart } from "@/lib/plan-cart";
import {
  planCartLineMonthlyWon,
  planCartMonthlyTotalWon,
  planCartPeriodTotalWon,
  planCartPortfolioPricing,
} from "@/lib/plan-cart-pricing";
import type { MediaItem } from "@/lib/media-data";
import { buildQuoteWizardLineContext } from "@/lib/quote-wizard-pricing";

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

const monthlyMedia: MediaItem = {
  id: "m-monthly",
  name: "월단가 매체",
  nameEn: "Monthly",
  location: "서울",
  locationEn: "Seoul",
  region: "seoul",
  type: "digital",
  price: 10_000_000,
  pricePeriod: "month",
  lat: 0,
  lng: 0,
  dailyFootTraffic: 0,
  sampleImages: [],
  partialPeriodRates: { "15days": 0.6 },
  priceOptions: [{ label: "기본", price: 10_000_000, period: "month" }],
};

test("planCartPeriodTotalWon — 15-day period matches quote wizard 60% override", () => {
  const cart: PlanCart = {
    items: [
      {
        mediaId: "m-monthly",
        mediaName: "월단가",
        mediaType: "digital",
        region: "seoul",
        price: 10_000_000,
        addedFrom: "planner",
        addedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    duration: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  const wizardLine = buildQuoteWizardLineContext(monthlyMedia, {
    isKo: true,
    campaignPeriod: "15days",
    campaignPeriodLabel: "15일",
    priceOptionIndex: 0,
  });

  const cartTotal = planCartPeriodTotalWon(cart, [monthlyMedia], {
    months: 15 / 30,
  });

  assert.equal(cartTotal, Math.round(wizardLine.lineTotalMan * 10_000));
  assert.equal(cartTotal, 6_000_000);
});

test("planCartPeriodTotalWon — no override keeps monthly × months", () => {
  const plain: MediaItem = {
    ...monthlyMedia,
    id: "m-plain",
    partialPeriodRates: undefined,
  };
  const cart: PlanCart = {
    items: [
      {
        mediaId: "m-plain",
        mediaName: "Plain",
        mediaType: "digital",
        region: "seoul",
        price: 10_000_000,
        addedFrom: "planner",
        addedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    duration: 3,
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  const cartTotal = planCartPeriodTotalWon(cart, [plain], { months: 3 });
  assert.equal(cartTotal, 30_000_000);
});

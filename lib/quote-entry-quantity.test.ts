import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "@/lib/media-data";
import { resolveQuoteUnitsForPriceOption } from "@/lib/quote-entry-quantity";

const gradeBus: MediaItem = {
  id: "bus",
  name: "B",
  nameEn: "B",
  location: "",
  locationEn: "",
  region: "",
  type: "버스",
  price: 0,
  lat: 0,
  lng: 0,
  dailyFootTraffic: 0,
  sampleImages: [],
  priceOptions: [
    { label: "SSA", price: 1_500_000, period: "month", units: 40 },
    { label: "A", price: 1_200_000, period: "month", units: 20 },
  ],
};

test("grade selection overrides stale default units", () => {
  assert.equal(resolveQuoteUnitsForPriceOption(gradeBus, 1, 40), 20);
});

test("non-grade keeps explicit units", () => {
  const mobile: MediaItem = {
    ...gradeBus,
    type: "mobile",
    priceOptions: [],
    price: 3_000_000,
  };
  assert.equal(resolveQuoteUnitsForPriceOption(mobile, 0, 5), 5);
});

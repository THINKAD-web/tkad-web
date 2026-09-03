import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "@/lib/media-data";
import {
  calculateMediaQuoteByDays,
  isCompareOnlineBillingHeld,
} from "./compare-quote.ts";
import { hasOnlinePricingSpec } from "./pricing-unavailable.ts";

function onlineCalculableMedia(): MediaItem {
  return {
    id: "online-1",
    name: "구글 검색광고",
    nameEn: "Google Search",
    location: "온라인",
    locationEn: "Online",
    region: "national",
    type: "",
    price: 0,
    lat: 0,
    lng: 0,
    dailyFootTraffic: 0,
    sampleImages: [],
    catalogChannel: "online",
    onlineSpec: {
      platform: "google",
      minBudget: 500_000,
      cpcMin: 100,
      cpcMax: 300,
      cpmMin: null,
      cpmMax: null,
    },
  };
}

test("isCompareOnlineBillingHeld blocks online even when onlineSpec present", () => {
  const m = onlineCalculableMedia();
  assert.equal(hasOnlinePricingSpec(m), true);
  assert.equal(isCompareOnlineBillingHeld(m), true);
});

test("calculateMediaQuoteByDays keeps inquiry while compare hold gate active", () => {
  const line = calculateMediaQuoteByDays(onlineCalculableMedia(), 30);
  assert.equal(line.pricingUnavailable, true);
  assert.equal(line.costWon, 0);
});

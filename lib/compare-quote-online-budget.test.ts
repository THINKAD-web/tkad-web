import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "@/lib/media-data";
import {
  calculateMediaQuoteByDays,
  calculateOnlineMediaQuoteByBudget,
  shouldUseOnlineBudgetQuote,
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

test("shouldUseOnlineBudgetQuote is true for calculable online rows", () => {
  const m = onlineCalculableMedia();
  assert.equal(hasOnlinePricingSpec(m), true);
  assert.equal(shouldUseOnlineBudgetQuote(m), true);
});

test("calculateOnlineMediaQuoteByBudget bills at budget with impressions", () => {
  const line = calculateOnlineMediaQuoteByBudget(onlineCalculableMedia(), 1_000_000);
  assert.equal(line.pricingUnavailable, false);
  assert.equal(line.costWon, 1_000_000);
  assert.ok(line.impressions > 0);
  assert.ok(line.cpm != null && line.cpm > 0);
});

test("calculateOnlineMediaQuoteByBudget below min stays inquiry", () => {
  const line = calculateOnlineMediaQuoteByBudget(onlineCalculableMedia(), 100_000);
  assert.equal(line.pricingUnavailable, true);
  assert.equal(line.costWon, 0);
});

test("calculateMediaQuoteByDays does not OOH-prorate calculable online", () => {
  const line = calculateMediaQuoteByDays(onlineCalculableMedia(), 30);
  assert.equal(line.pricingUnavailable, true);
  assert.equal(line.costWon, 0);
});

import assert from "node:assert/strict";
import { test } from "node:test";
import type { MediaItem } from "@/lib/media-data";
import { calculateMediaQuoteByDays } from "@/lib/compare-quote";
import { plannerMediaPeriodLineWon } from "@/lib/planner/planner-media-quantity";

function wallMedia(
  partialPeriodRates: MediaItem["partialPeriodRates"],
): MediaItem {
  return {
    id: "wall-test",
    name: "Test wall mural",
    nameEn: "Test wall mural",
    location: "Seoul",
    locationEn: "Seoul",
    region: "seoul",
    type: "static",
    mediaSubCategory: "wall_mural",
    price: 10_000_000,
    pricePeriod: "month",
    partialPeriodRates,
    lat: 0,
    lng: 0,
    dailyFootTraffic: 5000,
    sampleImages: [],
  } as MediaItem;
}

function linearFallbackWon(media: MediaItem, days: number): number {
  const months = days / 30;
  return Math.round(10_000_000 * months);
}

test("partial rate interpolate — single DB point (15days=60%) keeps linear fallback", () => {
  const media = wallMedia({ "15days": 0.6 });
  for (const days of [14, 10, 20] as const) {
    const months = days / 30;
    const got = plannerMediaPeriodLineWon(media, { months }, undefined, true);
    const expected = linearFallbackWon(media, days);
    assert.equal(
      got,
      expected,
      `${days}d should stay linear when only one rate point exists`,
    );
  }
});

test("partial rate interpolate — full schedule matches compare-quote for non-standard days", () => {
  const media = wallMedia({
    "1day": 0.05,
    "3days": 0.15,
    "5days": 0.22,
    "7days": 0.3,
    "15days": 0.55,
    "30days": 1.0,
  });
  for (const days of [14, 10, 20] as const) {
    const months = days / 30;
    const plannerWon = plannerMediaPeriodLineWon(media, { months }, undefined, true);
    const compareWon = calculateMediaQuoteByDays(media, days).costWon;
    assert.equal(
      plannerWon,
      compareWon,
      `${days}d planner should match compare-quote interpolate path`,
    );
    assert.notEqual(
      plannerWon,
      linearFallbackWon(media, days),
      `${days}d should differ from pure linear under full schedule`,
    );
  }
});

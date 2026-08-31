import assert from "node:assert/strict";
import test from "node:test";
import { calcMixMetrics } from "../mix-metrics.ts";
import { EMPTY_BRIEF, totalBudgetWon } from "../types.ts";
import type { MediaItem } from "../../../media-data.ts";
import {
  applyCustomLinesToMixMetrics,
  hasBriefMixContent,
} from "../custom-mix-metrics.ts";
import { createBriefCustomLine } from "../custom-lines.ts";

function fixtureMedia(over: Partial<MediaItem> = {}): MediaItem {
  return {
    id: "fx-1",
    name: "픽스처 DOOH",
    nameEn: "Fixture DOOH",
    location: "서울",
    locationEn: "Seoul",
    region: "seoul",
    regionMain: "seoul",
    type: "digital",
    subCategory: "led_screen",
    mediaSubCategory: "office",
    mediaMainCategory: "building",
    price: 10_000_000,
    pricePeriod: "month",
    lat: 37.5,
    lng: 127,
    dailyFootTraffic: 50_000,
    impressions: 1_500_000,
    sampleImages: [],
    ...over,
  };
}

test("hasBriefMixContent: catalog or custom", () => {
  assert.equal(hasBriefMixContent({}, []), false);
  assert.equal(hasBriefMixContent({ a: 1 }, []), true);
  assert.equal(
    hasBriefMixContent(
      {},
      [createBriefCustomLine({ name: "X", quantity: 1, unitPriceWon: 100 })],
    ),
    true,
  );
});

test("applyCustomLinesToMixMetrics adds cost and nulls CPM", () => {
  const media = fixtureMedia();
  const brief = {
    ...EMPTY_BRIEF,
    budgetInputWon: 50_000_000,
    budgetMode: "total" as const,
  };
  const catalog = calcMixMetrics({
    lines: [{ media, units: 1 }],
    days: 30,
    budgetWon: totalBudgetWon(brief),
    target: null,
  });
  const custom = createBriefCustomLine({
    name: "협의",
    quantity: 2,
    unitPriceWon: 1_000_000,
  });
  const merged = applyCustomLinesToMixMetrics(catalog, [custom]);

  assert.equal(
    merged.totalCostWon.value,
    catalog.totalCostWon.value + 2_000_000,
  );
  assert.equal(merged.mixCpmWon.value, null);
  assert.equal(merged.totalImpressions.value, catalog.totalImpressions.value);
  assert.equal(merged.isOverBudget, merged.overBudgetWon > 0);
});

test("applyCustomLinesToMixMetrics: empty custom → unchanged", () => {
  const media = fixtureMedia();
  const catalog = calcMixMetrics({
    lines: [{ media, units: 1 }],
    days: 30,
    budgetWon: 30_000_000,
    target: null,
  });
  const merged = applyCustomLinesToMixMetrics(catalog, []);
  assert.deepEqual(merged, catalog);
});

test("custom-only mix: cost from custom, impressions zero", () => {
  const catalog = calcMixMetrics({
    lines: [],
    days: 30,
    budgetWon: 10_000_000,
    target: null,
  });
  const custom = createBriefCustomLine({
    name: "단독",
    quantity: 1,
    unitPriceWon: 5_000_000,
  });
  const merged = applyCustomLinesToMixMetrics(catalog, [custom]);
  assert.equal(merged.totalCostWon.value, 5_000_000);
  assert.equal(merged.mixCpmWon.value, null);
  assert.equal(merged.totalImpressions.value, 0);
});

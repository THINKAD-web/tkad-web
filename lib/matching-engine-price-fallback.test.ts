/**
 * Bug #4 — matching fallback uses display monthly SSOT when quantity path is 0.
 * Pins the only observed rank/budget-band change: 에어부산 기내 샘플 증정.
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  scoreMediaForRanking,
  type MatchingInput,
} from "./matching-engine.ts";
import {
  priceToMonthlyEquivalentWon,
  resolveMonthlyListPriceWon,
} from "./media-metrics.ts";
import { resolveMonthlyPriceForUnits } from "./media-quantity.ts";
import type { MediaItem } from "./media-data.ts";

/** Production fixture shape: raw price 0, single option ₩120만/월 */
const airBusanSample = {
  id: "cmrlzvqhh000a04kwnaxrsv22",
  name: "에어부산 기내 샘플 증정",
  type: "digital",
  region: "busan",
  price: 0,
  pricePeriod: "month",
  priceOptions: [
    { label: "샘플 증정", price: 1_200_000, period: "month" },
  ],
} as MediaItem;

const baseInput: MatchingInput = {
  monthlyBudgetWon: 50_000_000,
  regions: [],
  industry: "",
  targets: [],
  durationMonths: 1,
  goal: "awareness",
};

test("bug #4: quantity path is 0 so fallback applies for 에어부산-like media", () => {
  assert.equal(resolveMonthlyPriceForUnits(airBusanSample), 0);
  assert.equal(
    priceToMonthlyEquivalentWon(
      airBusanSample.price,
      airBusanSample.pricePeriod,
    ),
    0,
  );
  assert.equal(resolveMonthlyListPriceWon(airBusanSample), 1_200_000);
});

test("bug #4: before/after budget band — 18 (price=0) → 15 (display ₩120만)", () => {
  // Legacy band when monthly price resolved to 0: scoreBudget → 18
  const legacyPrice = priceToMonthlyEquivalentWon(
    airBusanSample.price,
    airBusanSample.pricePeriod,
  );
  assert.equal(legacyPrice, 0);
  const legacyBudgetPts = 18; // scoreBudget: price <= 0 && !network → 18

  const after = scoreMediaForRanking(airBusanSample, baseInput);
  assert.equal(after.breakdown.budget, 15);
  // ratio = 1.2M / 50M = 0.024 → below 0.1 band → 15
  assert.notEqual(after.breakdown.budget, legacyBudgetPts);
});

test("bug #4: display SSOT monthly price feeds budget ratio (not eliminated)", () => {
  const after = scoreMediaForRanking(airBusanSample, {
    ...baseInput,
    monthlyBudgetWon: 1_000_000,
  });
  // 1.2M > 1M budget → rawBudget -1 → scoreMediaForRanking clamps to 0
  assert.equal(after.breakdown.budget, 0);
});

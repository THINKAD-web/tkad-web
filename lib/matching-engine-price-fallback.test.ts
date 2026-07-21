/**
 * Matching budget price = display monthly SSOT (#4 / #4-2).
 * Pins price=0 + priceOptions media (에어부산 기내 샘플 증정).
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

test("#4-2: display SSOT used even when quantity path is 0", () => {
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

test("#4-2: budget band uses display ₩120만 (not price=0 → 18)", () => {
  const after = scoreMediaForRanking(airBusanSample, baseInput);
  // ratio = 1.2M / 50M = 0.024 → below 0.1 band → 15
  assert.equal(after.breakdown.budget, 15);
});

test("#4-2: display SSOT monthly price feeds budget ratio (over → 0 in ranking)", () => {
  const after = scoreMediaForRanking(airBusanSample, {
    ...baseInput,
    monthlyBudgetWon: 1_000_000,
  });
  // 1.2M > 1M budget → rawBudget -1 → scoreMediaForRanking clamps to 0
  assert.equal(after.breakdown.budget, 0);
});

test("#4-2: MatchingInput has no mediaQuantities field", () => {
  const input: MatchingInput = { ...baseInput };
  assert.equal(
    Object.prototype.hasOwnProperty.call(input, "mediaQuantities"),
    false,
  );
});

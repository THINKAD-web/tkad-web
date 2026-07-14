import assert from "node:assert/strict";
import test from "node:test";
import {
  priceToMonthlyEquivalentWon,
  formatMediaPriceWithPeriodSuffix,
} from "./media-price-format.ts";
import { buildHomePopularCardPriceDisplay } from "./home-popular-card-display.ts";

test("priceToMonthlyEquivalentWon applies period multipliers", () => {
  assert.equal(priceToMonthlyEquivalentWon(1_000_000, "month"), 1_000_000);
  assert.equal(priceToMonthlyEquivalentWon(1_000_000, "day"), 30_000_000);
  assert.equal(priceToMonthlyEquivalentWon(1_000_000, "week"), 4_000_000);
  assert.equal(priceToMonthlyEquivalentWon(1_000_000, "biweekly"), 2_000_000);
});

test("buildHomePopularCardPriceDisplay uses monthly primary for day period", () => {
  const display = buildHomePopularCardPriceDisplay(
    { price: 22_000_000, pricePeriod: "day" },
    "ko-KR",
    true,
  );
  assert.ok(display);
  assert.match(display!.primary, /\/월$/);
  assert.match(display!.secondary ?? "", /기준.*\/일/);
  assert.equal(
    display!.primary,
    formatMediaPriceWithPeriodSuffix(660_000_000, "month", "ko-KR"),
  );
});

test("buildHomePopularCardPriceDisplay keeps month-only label for monthly media", () => {
  const display = buildHomePopularCardPriceDisplay(
    { price: 80_000_000, pricePeriod: "month" },
    "ko-KR",
    true,
  );
  assert.ok(display);
  assert.equal(display!.secondary, null);
  assert.equal(
    display!.primary,
    formatMediaPriceWithPeriodSuffix(80_000_000, "month", "ko-KR"),
  );
});

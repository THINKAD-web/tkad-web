import assert from "node:assert/strict";
import test from "node:test";
import {
  priceToMonthlyEquivalentWon,
  formatMediaPriceWithPeriodSuffix,
} from "./media-price-format.ts";
import {
  buildHomePopularCardPriceDisplay,
  homePopularCardCpmWon,
} from "./home-popular-card-display.ts";
import { estimateCatalogCpmWon } from "./media-metrics.ts";

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

test("homePopularCardCpmWon uses catalogPrice not display price", () => {
  const item = {
    id: "pkg-multi",
    name: "패키지형",
    price: 15_000_000,
    pricePeriod: "month" as const,
    catalogPrice: 30_000_000,
    catalogPricePeriod: "month" as const,
    impressions: 5_500_000,
  };
  const got = homePopularCardCpmWon(item);
  const monthly = priceToMonthlyEquivalentWon(30_000_000, "month");
  const expected = estimateCatalogCpmWon({
    price: monthly,
    impressions: 5_500_000,
    cpm: undefined,
  });
  assert.equal(got, expected);
  assert.notEqual(
    got,
    estimateCatalogCpmWon({
      price: 15_000_000,
      impressions: 5_500_000,
      cpm: undefined,
    }),
  );
});

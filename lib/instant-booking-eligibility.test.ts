import assert from "node:assert/strict";
import test from "node:test";
import { normalizeMonthlyPriceWon } from "./instant-booking-eligibility.ts";
import { priceToMonthlyEquivalentWon } from "./media-price-format.ts";

/** 버그 #5 — SSOT 교체 후에도 정상 period는 동일 배수 */
test("normalizeMonthlyPriceWon matches priceToMonthlyEquivalentWon for standard periods", () => {
  const cases: Array<[number, string | null | undefined]> = [
    [1_000_000, "month"],
    [1_000_000, "day"],
    [1_000_000, "week"],
    [1_000_000, "biweekly"],
    [1_000_000, "DAY"],
    [1_000_000, null],
    [0, "day"],
    [22_000_000, "day"],
  ];
  for (const [price, period] of cases) {
    assert.equal(
      normalizeMonthlyPriceWon(price, period),
      priceToMonthlyEquivalentWon(price, period),
      `price=${price} period=${period}`,
    );
  }
});

test("normalizeMonthlyPriceWon day/week/biweekly factors", () => {
  assert.equal(normalizeMonthlyPriceWon(100, "day"), 3_000);
  assert.equal(normalizeMonthlyPriceWon(100, "week"), 400);
  assert.equal(normalizeMonthlyPriceWon(100, "biweekly"), 200);
  assert.equal(normalizeMonthlyPriceWon(100, "month"), 100);
});

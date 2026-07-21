import assert from "node:assert/strict";
import test from "node:test";
import {
  formatMediaDisplayPrice,
  formatMediaPriceCompactWon,
  formatMediaPriceWithPeriodSuffix,
} from "./media-price-format";

test("sub-manwon: won fallback (not ₩0만 / not inflated ₩1만)", () => {
  assert.equal(formatMediaPriceCompactWon(1, "ko"), "₩1");
  assert.equal(formatMediaPriceCompactWon(500, "ko"), "₩500");
  assert.equal(formatMediaPriceCompactWon(5_000, "ko"), "₩5,000");
  assert.equal(formatMediaPriceCompactWon(9_999, "ko"), "₩9,999");
  assert.equal(formatMediaPriceCompactWon(500, "en"), "₩500");
});

test("boundary: exactly 10_000 stays manwon compact", () => {
  assert.equal(formatMediaPriceCompactWon(10_000, "ko"), "₩1만");
});

test("inquiry ≤0 unchanged", () => {
  assert.equal(formatMediaPriceCompactWon(0, "ko"), "가격 문의");
  assert.equal(formatMediaPriceWithPeriodSuffix(0, "month", "ko"), "가격 문의");
});

test("normal manwon+ unchanged", () => {
  assert.equal(formatMediaPriceCompactWon(1_200_000, "ko"), "₩120만");
  assert.equal(
    formatMediaPriceWithPeriodSuffix(1_200_000, "month", "ko"),
    "₩120만/월",
  );
});

test("period suffix keeps won fallback for guerrilla-like price", () => {
  assert.equal(
    formatMediaPriceWithPeriodSuffix(500, "month", "ko"),
    "₩500/월",
  );
  assert.equal(
    formatMediaDisplayPrice(
      { price: 500, pricePeriod: "month", priceOptions: null },
      "ko",
    ),
    "₩500/월",
  );
});

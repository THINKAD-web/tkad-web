import assert from "node:assert/strict";
import test from "node:test";
import {
  formatMediaDisplayPrice,
  formatMediaPriceCompactWon,
  formatMediaPriceWithPeriodSuffix,
  formatMediaPriceWon,
  isMediaPriceOnInquiry,
  mediaPriceOnInquiryLabel,
  resolveMediaDisplayPrice,
} from "./media-price-format";

test("mediaPriceOnInquiryLabel ko/en", () => {
  assert.equal(mediaPriceOnInquiryLabel("ko"), "가격 문의");
  assert.equal(mediaPriceOnInquiryLabel("en-US"), "Price on request");
});

test("formatters: ≤0 → 가격 문의 (not ₩0, not bare 문의)", () => {
  assert.equal(formatMediaPriceCompactWon(0, "ko"), "가격 문의");
  assert.equal(formatMediaPriceWithPeriodSuffix(0, "month", "ko"), "가격 문의");
  assert.equal(formatMediaPriceWon(0, "ko"), "가격 문의");
  assert.ok(!formatMediaPriceWon(0, "ko").endsWith("원"));
  assert.equal(formatMediaPriceCompactWon(0, "en"), "Price on request");
});

test("formatters: positive price unchanged", () => {
  assert.equal(formatMediaPriceCompactWon(1_200_000, "ko"), "₩120만");
  assert.match(formatMediaPriceWithPeriodSuffix(1_200_000, "month", "ko"), /₩120만/);
});

test("isMediaPriceOnInquiry uses displayWon (options), not bare price", () => {
  const inquiry = {
    price: 0,
    pricePeriod: "month" as const,
    priceOptions: null,
  };
  assert.equal(resolveMediaDisplayPrice(inquiry).priceWon, 0);
  assert.equal(isMediaPriceOnInquiry(inquiry), true);
  assert.equal(formatMediaDisplayPrice(inquiry, "ko"), "가격 문의");

  const airBusanLike = {
    price: 0,
    pricePeriod: "month" as const,
    priceOptions: [{ label: "1편", price: 1_200_000, period: "month" }],
  };
  assert.equal(resolveMediaDisplayPrice(airBusanLike).priceWon, 1_200_000);
  assert.equal(isMediaPriceOnInquiry(airBusanLike), false);
  assert.match(formatMediaDisplayPrice(airBusanLike, "ko"), /₩120만/);
});

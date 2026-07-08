import assert from "node:assert/strict";
import test from "node:test";
import {
  coerceOohQuoteTotalAmountManwon,
  formatOohQuoteManwonShort,
  formatOohQuoteTotalKrw,
  isLikelyWonStoredAsManwon,
  oohQuoteManwonToWon,
  wonToManwon,
} from "@/lib/ooh-quote-amount";
import { manwonToWon } from "@/lib/admin-quote-to-ooh";

test("4080만 → ₩40,800,000 (preview must not show ₩4,080)", () => {
  assert.equal(oohQuoteManwonToWon(4080), 40_800_000);
  assert.equal(formatOohQuoteTotalKrw(4080), "₩40,800,000");
});

test("9240만 bridge total matches won display", () => {
  const quoteTotalWon = 92_400_000;
  const manwon = wonToManwon(quoteTotalWon);
  assert.equal(manwon, 9240);
  assert.equal(formatOohQuoteTotalKrw(manwon), "₩92,400,000");
  assert.equal(manwonToWon(manwon), quoteTotalWon);
});

test("formatOohQuoteManwonShort for admin booking tab", () => {
  assert.equal(formatOohQuoteManwonShort(4080), "₩4,080만");
});

test("quote/create path: 6000만 media sum stored as manwon not won", () => {
  const mediaSumWon = 60_000_000;
  const totalAmountManwon = Math.max(1, wonToManwon(mediaSumWon));
  assert.equal(totalAmountManwon, 6000);
  assert.equal(formatOohQuoteTotalKrw(totalAmountManwon), "₩60,000,000");
});

test("detect won stored as manwon (quote/create bug)", () => {
  const mediaSumWon = 60_000_000;
  assert.equal(isLikelyWonStoredAsManwon(60_000_000, mediaSumWon), true);
  assert.equal(isLikelyWonStoredAsManwon(6000, mediaSumWon), false);
});

test("coerce display for legacy wrong row", () => {
  const mediaSumWon = 60_000_000;
  const r = coerceOohQuoteTotalAmountManwon(60_000_000, mediaSumWon);
  assert.equal(r.corrected, true);
  assert.equal(r.manwon, 6000);
  assert.equal(formatOohQuoteTotalKrw(r.manwon), "₩60,000,000");
});

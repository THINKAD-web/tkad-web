import assert from "node:assert/strict";
import test from "node:test";
import {
  formatOohQuoteManwonShort,
  formatOohQuoteTotalKrw,
  oohQuoteManwonToWon,
} from "@/lib/ooh-quote-amount";
import { manwonToWon, wonToManwon } from "@/lib/admin-quote-to-ooh";

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

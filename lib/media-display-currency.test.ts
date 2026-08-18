import assert from "node:assert/strict";
import test from "node:test";
import {
  formatJpyFromKrwWon,
  formatMediaPriceForDisplay,
  formatMediaPriceJpyPreview,
  getKrwJpyRate,
  isJapanDisplayCountry,
  krwWonToJpy,
} from "./media-display-currency.ts";

const ORIGINAL_RATE = process.env.KRW_JPY_RATE;

test.after(() => {
  if (ORIGINAL_RATE === undefined) delete process.env.KRW_JPY_RATE;
  else process.env.KRW_JPY_RATE = ORIGINAL_RATE;
});

test("isJapanDisplayCountry: JP only", () => {
  assert.equal(isJapanDisplayCountry("JP"), true);
  assert.equal(isJapanDisplayCountry("jp"), true);
  assert.equal(isJapanDisplayCountry("KR"), false);
  assert.equal(isJapanDisplayCountry(null), false);
});

test("krwWonToJpy uses env rate when set", () => {
  process.env.KRW_JPY_RATE = "0.1";
  assert.equal(getKrwJpyRate(), 0.1);
  assert.equal(krwWonToJpy(1_000_000), 100_000);
});

test("formatMediaPriceForDisplay: KR unchanged compact won", () => {
  process.env.KRW_JPY_RATE = "0.1126";
  const label = formatMediaPriceForDisplay(22_000_000, "KR", "ko-KR");
  assert.match(label, /₩/);
  assert.match(label, /2,200만|2200/);
});

test("formatMediaPriceForDisplay: JP shows yen prefix", () => {
  process.env.KRW_JPY_RATE = "0.1";
  assert.equal(formatMediaPriceForDisplay(1_000_000, "JP", "ko-KR"), "¥100,000");
});

test("formatMediaPriceJpyPreview returns null for zero price", () => {
  assert.equal(formatMediaPriceJpyPreview(0), null);
});

test("formatJpyFromKrwWon rounds to integer yen", () => {
  process.env.KRW_JPY_RATE = "0.1126";
  assert.equal(formatJpyFromKrwWon(10_000_000), "¥1,126,000");
});

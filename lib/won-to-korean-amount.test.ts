import assert from "node:assert/strict";
import test from "node:test";
import { wonToKoreanLegalAmount } from "@/lib/won-to-korean-amount";

test("wonToKoreanLegalAmount — spectory sample", () => {
  assert.equal(wonToKoreanLegalAmount(2_156_000), "이백일십오만육천원정");
});

test("wonToKoreanLegalAmount — round numbers", () => {
  assert.equal(wonToKoreanLegalAmount(10_000), "일만원정");
  assert.equal(wonToKoreanLegalAmount(100_000_000), "일억원정");
  assert.equal(wonToKoreanLegalAmount(1_005_000), "백만오천원정");
});

test("wonToKoreanLegalAmount — zero/invalid", () => {
  assert.equal(wonToKoreanLegalAmount(0), "영원정");
  assert.equal(wonToKoreanLegalAmount(-1), "영원정");
});

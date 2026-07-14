import assert from "node:assert/strict";
import test from "node:test";
import { normalizeQuoteEnvText } from "@/lib/formal-quote-issuer";

test("normalizeQuoteEnvText removes literal \\n sequences", () => {
  assert.equal(normalizeQuoteEnvText("기업은행\\n", "fallback"), "기업은행");
  assert.equal(
    normalizeQuoteEnvText("319-86-00382\\n", "fallback"),
    "319-86-00382",
  );
  assert.equal(
    normalizeQuoteEnvText("sales@tkad.co.kr\\n", "fallback"),
    "sales@tkad.co.kr",
  );
});

test("normalizeQuoteEnvText collapses real newlines", () => {
  assert.equal(normalizeQuoteEnvText("서울\n성동구", "fallback"), "서울 성동구");
});

test("normalizeQuoteEnvText returns fallback for empty values", () => {
  assert.equal(normalizeQuoteEnvText(undefined, "default"), "default");
  assert.equal(normalizeQuoteEnvText("   ", "default"), "default");
});

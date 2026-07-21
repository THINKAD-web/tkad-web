import assert from "node:assert/strict";
import test from "node:test";
import { formatAdminQuoteOptionSelectLabel } from "./admin-quote-option-select-label.ts";

test("appends price/period to label (KT-style)", () => {
  const label = formatAdminQuoteOptionSelectLabel(
    { label: "영상(15초)", price: 120_000_000, period: "month" },
    undefined,
    "ko",
  );
  assert.equal(label, "영상(15초) — ₩1.2억/월");
});

test("falls back to media period when option period missing", () => {
  const label = formatAdminQuoteOptionSelectLabel(
    { label: "기본", price: 5_000_000 },
    "week",
    "ko",
  );
  assert.equal(label, "기본 — ₩500만/주");
});

test("uses price only when label empty", () => {
  const label = formatAdminQuoteOptionSelectLabel(
    { label: "  ", price: 1_000_000, period: "month" },
    undefined,
    "ko",
  );
  assert.equal(label, "₩100만/월");
});

test("shows distinct prices for different options", () => {
  const a = formatAdminQuoteOptionSelectLabel(
    { label: "A", price: 10_000_000, period: "month" },
    undefined,
    "ko",
  );
  const b = formatAdminQuoteOptionSelectLabel(
    { label: "B", price: 15_000_000, period: "month" },
    undefined,
    "ko",
  );
  assert.equal(a, "A — ₩1,000만/월");
  assert.equal(b, "B — ₩1,500만/월");
});

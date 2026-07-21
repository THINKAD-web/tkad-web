/**
 * Tests for normalizePriceOptionsForPrisma period write rules.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { normalizePriceOptionsForPrisma } from "./admin-media-price-options.ts";

test("accepts canonical period", () => {
  const r = normalizePriceOptionsForPrisma({
    priceOptions: [{ label: "기본", price: 1_000_000, period: "week" }],
  });
  assert.equal(r.kind, "ok");
  if (r.kind === "ok") {
    const arr = r.data as Array<{ period?: string }>;
    assert.equal(arr[0]?.period, "week");
  }
});

test("coerces 1개월 alias to month", () => {
  const r = normalizePriceOptionsForPrisma({
    priceOptions: [{ label: "1개월", price: 5_000_000, period: "1개월" }],
  });
  assert.equal(r.kind, "ok");
  if (r.kind === "ok") {
    const arr = r.data as Array<{ period?: string }>;
    assert.equal(arr[0]?.period, "month");
  }
});

test("rejects short Korean period (no auto day)", () => {
  const r = normalizePriceOptionsForPrisma({
    priceOptions: [{ label: "1일", price: 700_000, period: "1일" }],
  });
  assert.equal(r.kind, "error");
  if (r.kind === "error") {
    assert.match(r.message, /day\|week\|biweekly\|month/);
  }
});

test("rejects 2주 (Phase B — no auto biweekly on write)", () => {
  const r = normalizePriceOptionsForPrisma({
    priceOptions: [{ label: "2주", price: 2_000_000, period: "2주" }],
  });
  assert.equal(r.kind, "error");
});

test("omit period when missing", () => {
  const r = normalizePriceOptionsForPrisma({
    priceOptions: [{ label: "기본", price: 1_000_000 }],
  });
  assert.equal(r.kind, "ok");
  if (r.kind === "ok") {
    const arr = r.data as Array<{ period?: string }>;
    assert.equal(arr[0]?.period, undefined);
  }
});

test("skip when key absent", () => {
  const r = normalizePriceOptionsForPrisma({ name: "x" });
  assert.equal(r.kind, "skip");
});

/**
 * Write-path period coercion for priceOptions[].period.
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  coercePriceOptionPeriodForWrite,
  isCanonicalMediaPricePeriod,
  isSafeMonthPeriodAlias,
  SAFE_MONTH_PERIOD_ALIASES,
} from "./media-price-period-write.ts";

test("canonical periods pass through", () => {
  for (const p of ["month", "biweekly", "week", "day"] as const) {
    assert.equal(isCanonicalMediaPricePeriod(p), true);
    assert.deepEqual(coercePriceOptionPeriodForWrite(p), {
      kind: "ok",
      period: p,
    });
  }
});

test("safe month aliases coerce to month", () => {
  for (const a of SAFE_MONTH_PERIOD_ALIASES) {
    assert.equal(isSafeMonthPeriodAlias(a), true);
    const r = coercePriceOptionPeriodForWrite(a);
    assert.equal(r.kind, "ok");
    if (r.kind === "ok") {
      assert.equal(r.period, "month");
      assert.equal(r.coercedFrom, a);
    }
  }
  const monthly = coercePriceOptionPeriodForWrite("Monthly");
  assert.equal(monthly.kind, "ok");
  if (monthly.kind === "ok") assert.equal(monthly.period, "month");
});

test("empty / missing omit", () => {
  assert.deepEqual(coercePriceOptionPeriodForWrite(null), { kind: "omit" });
  assert.deepEqual(coercePriceOptionPeriodForWrite(""), { kind: "omit" });
  assert.deepEqual(coercePriceOptionPeriodForWrite("  "), { kind: "omit" });
});

test("short / ambiguous periods are rejected (no auto day/week)", () => {
  for (const bad of ["1일", "7일", "2주", "15일", "2개월", "12개월", "시즌", "1회"]) {
    const r = coercePriceOptionPeriodForWrite(bad);
    assert.equal(r.kind, "error", bad);
  }
});

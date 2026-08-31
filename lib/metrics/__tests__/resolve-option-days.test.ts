import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  periodToDays,
  readCustomPeriodDays,
  resolveOptionDays,
} from "../price.ts";

describe("resolveOptionDays", () => {
  it("prefers explicit custom days over period enum", () => {
    assert.equal(resolveOptionDays("month", 45), 45);
    assert.equal(resolveOptionDays("day", 14), 14);
  });

  it("falls back to periodToDays when custom days absent", () => {
    assert.equal(resolveOptionDays("month", null), periodToDays("month"));
    assert.equal(resolveOptionDays("week", undefined), 7);
    assert.equal(resolveOptionDays("day", 0), 1);
  });

  it("readCustomPeriodDays rejects non-positive values", () => {
    assert.equal(readCustomPeriodDays(0), null);
    assert.equal(readCustomPeriodDays(-3), null);
    assert.equal(readCustomPeriodDays("30"), null);
  });
});

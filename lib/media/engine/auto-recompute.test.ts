import assert from "node:assert/strict";
import test from "node:test";
import { shouldAutoRecomputeMediaMetrics } from "./auto-recompute.ts";

test("shouldAutoRecompute: footfall + missing impressions → true", () => {
  assert.equal(
    shouldAutoRecomputeMediaMetrics({
      dailyFootfall: 100_000,
      impressions: null,
    }),
    true,
  );
});

test("shouldAutoRecompute: footfall + zero impressions → true", () => {
  assert.equal(
    shouldAutoRecomputeMediaMetrics({
      dailyFootfall: 100_000,
      impressions: 0,
    }),
    true,
  );
});

test("shouldAutoRecompute: existing impressions → false (no overwrite)", () => {
  assert.equal(
    shouldAutoRecomputeMediaMetrics({
      dailyFootfall: 215_000,
      impressions: 6_450_000,
    }),
    false,
  );
});

test("shouldAutoRecompute: no footfall → false", () => {
  assert.equal(
    shouldAutoRecomputeMediaMetrics({
      dailyFootfall: null,
      impressions: null,
    }),
    false,
  );
});

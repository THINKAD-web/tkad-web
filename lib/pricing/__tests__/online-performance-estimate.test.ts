import assert from "node:assert/strict";
import test from "node:test";
import {
  estimatePerformance,
  hasOnlinePricingSpec,
  onlinePricingLabel,
} from "@/lib/pricing/online-performance-estimate";

const pricedSpec = {
  minBudget: 500_000,
  cpcMin: 100,
  cpcMax: 500,
  cpmMin: 3_000,
  cpmMax: 8_000,
};

test("hasOnlinePricingSpec — true when any rate present", () => {
  assert.equal(hasOnlinePricingSpec(pricedSpec), true);
  assert.equal(
    hasOnlinePricingSpec({ minBudget: 1_000_000, cpcMin: null, cpcMax: null, cpmMin: null, cpmMax: null }),
    false,
  );
});

test("onlinePricingLabel — CPC/CPM ranges", () => {
  assert.match(onlinePricingLabel(pricedSpec), /CPC 100~500원/);
  assert.match(onlinePricingLabel(pricedSpec), /CPM 3,000~8,000원/);
  assert.equal(
    onlinePricingLabel({ minBudget: 1_000_000, cpcMin: null, cpcMax: null, cpmMin: null, cpmMax: null }),
    "문의",
  );
});

test("estimatePerformance — dmpilot parity (1M budget)", () => {
  const est = estimatePerformance(pricedSpec, 1_000_000);
  assert.ok(est);
  assert.equal(est!.reachMax, Math.floor((1_000_000 / 3_000) * 1000));
  assert.equal(est!.reachMin, Math.floor((1_000_000 / 8_000) * 1000));
  assert.equal(est!.clicksMax, Math.floor(1_000_000 / 100));
  assert.equal(est!.clicksMin, Math.floor(1_000_000 / 500));
});

test("estimatePerformance — null for zero budget", () => {
  assert.equal(estimatePerformance(pricedSpec, 0), null);
});

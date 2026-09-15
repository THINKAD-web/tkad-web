import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveEffectiveRequestedBudgetMan,
  planCartRequestBudgetOverrideNotice,
} from "@/lib/plan-cart-report/request-budget-override";

test("resolveEffectiveRequestedBudgetMan — override wins over cart entry", () => {
  assert.equal(
    resolveEffectiveRequestedBudgetMan({
      cartRequestedBudgetMan: 2500,
      budgetMan: 49000,
      overrideMan: 3000,
    }),
    3000,
  );
});

test("resolveEffectiveRequestedBudgetMan — cart entry when no override", () => {
  assert.equal(
    resolveEffectiveRequestedBudgetMan({
      cartRequestedBudgetMan: 2500,
      budgetMan: 49000,
      overrideMan: null,
    }),
    2500,
  );
});

test("resolveEffectiveRequestedBudgetMan — budgetMan fallback", () => {
  assert.equal(
    resolveEffectiveRequestedBudgetMan({
      budgetMan: 49000,
      overrideMan: null,
    }),
    49000,
  );
});

test("planCartRequestBudgetOverrideNotice — ko/en", () => {
  assert.match(planCartRequestBudgetOverrideNotice(true), /카트 입력값/);
  assert.match(planCartRequestBudgetOverrideNotice(false), /cart entry/i);
});

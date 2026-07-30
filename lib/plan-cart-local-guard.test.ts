import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  msUntilPlanCartApplyAllowed,
  PLAN_CART_LOCAL_EDIT_GRACE_MS,
  resetPlanCartLocalGuardForTests,
  setPlanCartUserEditing,
  shouldDeferServerPlanCartApply,
  touchPlanCartLocalEdit,
} from "@/lib/plan-cart-local-guard";

describe("plan-cart-local-guard", () => {
  beforeEach(() => {
    resetPlanCartLocalGuardForTests();
  });

  it("defers apply during explicit editing", () => {
    setPlanCartUserEditing(true);
    assert.equal(shouldDeferServerPlanCartApply(), true);
    setPlanCartUserEditing(false);
    assert.equal(shouldDeferServerPlanCartApply(), true);
    assert.ok(msUntilPlanCartApplyAllowed() > 0);
  });

  it("defers apply within grace period after local touch", () => {
    touchPlanCartLocalEdit();
    assert.equal(shouldDeferServerPlanCartApply(), true);
    assert.ok(msUntilPlanCartApplyAllowed() <= PLAN_CART_LOCAL_EDIT_GRACE_MS);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveCrossChannelAllocation } from "@/lib/integrated/allocation-policy";

describe("resolveCrossChannelAllocation", () => {
  it("applies goal default splits when no user override", () => {
    assert.equal(
      resolveCrossChannelAllocation({
        budgetTotalWon: 100_000_000,
        goal: "local",
      }).digitalBudgetPct,
      25,
    );
    assert.equal(
      resolveCrossChannelAllocation({
        budgetTotalWon: 100_000_000,
        goal: "brand",
      }).digitalBudgetPct,
      35,
    );
    assert.equal(
      resolveCrossChannelAllocation({
        budgetTotalWon: 100_000_000,
        goal: "event",
      }).digitalBudgetPct,
      40,
    );
    assert.equal(
      resolveCrossChannelAllocation({
        budgetTotalWon: 100_000_000,
        goal: "sales",
      }).digitalBudgetPct,
      45,
    );
  });

  it("user digitalBudgetPct wins over goal default", () => {
    const result = resolveCrossChannelAllocation({
      budgetTotalWon: 50_000_000,
      goal: "brand",
      digitalBudgetPct: 60,
    });
    assert.equal(result.policy, "user_override");
    assert.equal(result.digitalBudgetPct, 60);
    assert.equal(result.digitalBudgetWon, 30_000_000);
    assert.equal(result.oohBudgetWon, 20_000_000);
  });
});

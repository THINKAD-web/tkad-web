import assert from "node:assert/strict";
import test from "node:test";
import {
  formatBudgetManDisplay,
  isBudgetTbd,
  resolveBudgetManForMatching,
} from "@/lib/budget-tbd";

test("isBudgetTbd — only explicit true", () => {
  assert.equal(isBudgetTbd(true), true);
  assert.equal(isBudgetTbd(false), false);
  assert.equal(isBudgetTbd(undefined), false);
});

test("formatBudgetManDisplay — TBD label", () => {
  assert.equal(formatBudgetManDisplay(3000, true, { tbd: true }), "예산 미정");
  assert.equal(
    formatBudgetManDisplay(3000, false, { tbd: true }),
    "Budget TBD",
  );
  assert.match(formatBudgetManDisplay(3000, true), /3,000/);
});

test("resolveBudgetManForMatching — TBD uses fallback, not unlimited", () => {
  assert.equal(resolveBudgetManForMatching(0, { tbd: true }), 500);
  assert.equal(resolveBudgetManForMatching(0, { unlimited: true }), 500);
  assert.equal(resolveBudgetManForMatching(1200, { tbd: false }), 1200);
});

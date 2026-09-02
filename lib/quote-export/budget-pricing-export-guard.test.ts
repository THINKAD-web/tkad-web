import assert from "node:assert/strict";
import test from "node:test";
import { BUDGET_PRICING_NOT_IMPLEMENTED } from "@/lib/pricing/budget-pricing";
import {
  budgetPricingExportUserMessage,
  isBudgetPricingNotImplementedError,
} from "@/lib/quote-export/budget-pricing-export-guard";

test("isBudgetPricingNotImplementedError detects BudgetPricing throw", () => {
  assert.equal(
    isBudgetPricingNotImplementedError(
      new Error(
        `${BUDGET_PRICING_NOT_IMPLEMENTED}: mediaId=x catalogChannel=online — PR2 미구현, PR5 예정`,
      ),
    ),
    true,
  );
  assert.equal(isBudgetPricingNotImplementedError(new Error("NO_MEDIA_FOUND")), false);
});

test("budgetPricingExportUserMessage matches inquiry tone", () => {
  assert.match(budgetPricingExportUserMessage(true), /가격 문의/);
  assert.match(budgetPricingExportUserMessage(false), /contact us/i);
});

import {
  estimateImpressionsFromBudget,
  hasOnlinePricingSpec as hasRatesOnSpec,
} from "@/lib/pricing/online-performance-estimate";
import { hasOnlinePricingSpec } from "@/lib/pricing-unavailable";
import type { PricingStrategy, PricingStrategyLineInput } from "@/lib/pricing/strategy-types";
import type { QuoteLineItem } from "@/lib/pricing/strategy-types";

export const BUDGET_PRICING_NOT_IMPLEMENTED = "BUDGET_PRICING_NOT_IMPLEMENTED";
export const BUDGET_PRICING_BUDGET_REQUIRED = "BUDGET_PRICING_BUDGET_REQUIRED";
export const BUDGET_PRICING_BELOW_MIN = "BUDGET_PRICING_BELOW_MIN";

function inquiryLine(
  m: PricingStrategyLineInput["media"],
  periodDays: number,
): QuoteLineItem {
  return {
    mediaId: m.id,
    mediaName: m.name,
    location: m.location,
    periodDays,
    unitPriceWon: 0,
    lineSupplyWon: 0,
    impressions: 0,
  };
}

export class BudgetPricing implements PricingStrategy {
  calculateLine({ media: m, ctx }: PricingStrategyLineInput): QuoteLineItem {
    const spec = m.onlineSpec;
    if (!hasOnlinePricingSpec({ catalogChannel: m.catalogChannel, onlineSpec: spec })) {
      return inquiryLine(m, ctx.periodDays);
    }
    if (!spec || !hasRatesOnSpec(spec)) {
      return inquiryLine(m, ctx.periodDays);
    }

    const sel = ctx.selectionMap.get(m.id);
    const budgetWon = sel?.lineTotalWon ?? 0;
    if (budgetWon <= 0) {
      throw new Error(
        `${BUDGET_PRICING_BUDGET_REQUIRED}: mediaId=${m.id} catalogChannel=online — lineTotalWon required in mediaSelections`,
      );
    }
    const minBudget = spec.minBudget ?? 0;
    if (minBudget > 0 && budgetWon < minBudget) {
      throw new Error(
        `${BUDGET_PRICING_BELOW_MIN}: mediaId=${m.id} minBudget=${minBudget} budgetWon=${budgetWon}`,
      );
    }

    const impressions = estimateImpressionsFromBudget(spec, budgetWon);
    return {
      mediaId: m.id,
      mediaName: m.name,
      location: m.location,
      periodDays: ctx.periodDays,
      unitPriceWon: budgetWon,
      lineSupplyWon: budgetWon,
      impressions,
    };
  }
}

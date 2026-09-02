import type { PricingStrategy, PricingStrategyLineInput } from "@/lib/pricing/strategy-types";
import type { QuoteLineItem } from "@/lib/pricing/strategy-types";

export const BUDGET_PRICING_NOT_IMPLEMENTED = "BUDGET_PRICING_NOT_IMPLEMENTED";

export class BudgetPricing implements PricingStrategy {
  calculateLine({ media: m }: PricingStrategyLineInput): QuoteLineItem {
    const specHint = m.onlineSpec?.platform
      ? ` platform=${m.onlineSpec.platform}`
      : "";
    throw new Error(
      `${BUDGET_PRICING_NOT_IMPLEMENTED}: mediaId=${m.id} catalogChannel=online — PR2 미구현, PR5 예정${specHint}`,
    );
  }
}

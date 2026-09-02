import type { CatalogChannel } from "@prisma/client";
import { BudgetPricing } from "@/lib/pricing/budget-pricing";
import { FixedPeriodPricing } from "@/lib/pricing/fixed-period-pricing";
import type { PricingStrategy } from "@/lib/pricing/strategy-types";

const fixedPeriod = new FixedPeriodPricing();
const budget = new BudgetPricing();

/** Single catalog_channel branch for quote pricing (PR2). */
export function resolvePricingStrategy(
  catalogChannel: string | null | undefined,
): PricingStrategy {
  if (catalogChannel === "online") {
    return budget;
  }
  return fixedPeriod;
}

export function isOnlineCatalogChannel(
  catalogChannel: string | null | undefined,
): catalogChannel is CatalogChannel {
  return catalogChannel === "online";
}

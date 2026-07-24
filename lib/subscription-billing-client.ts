import {
  AGENCY_MONTHLY_KRW,
  LITE_MONTHLY_KRW,
} from "@/lib/entitlements/constants";
import { discountedProPriceKrw } from "@/lib/entitlements/pricing";

/**
 * Client-safe checkout helpers (no Prisma / server secrets).
 * Mirrors labels/amounts in `lib/subscription-billing.ts`.
 */

export type CheckoutablePlan = "LITE" | "PRO" | "AGENCY";

export function amountKrwForCheckoutPlan(plan: CheckoutablePlan): number {
  if (plan === "LITE") return LITE_MONTHLY_KRW;
  if (plan === "AGENCY") return AGENCY_MONTHLY_KRW;
  return discountedProPriceKrw();
}

export function orderNameForCheckoutPlan(
  plan: CheckoutablePlan,
  isKo: boolean,
): string {
  if (plan === "LITE") {
    return isKo ? "THINKAD LITE 월 구독" : "THINKAD LITE monthly";
  }
  if (plan === "AGENCY") {
    return isKo ? "THINKAD AGENCY 월 구독" : "THINKAD AGENCY monthly";
  }
  return isKo ? "THINKAD PRO 월 구독" : "THINKAD PRO monthly";
}

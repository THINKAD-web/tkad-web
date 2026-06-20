/** Client-safe pricing constants (no server/DB imports). @deprecated import from `@/lib/entitlements` */
export {
  PRO_MONTHLY_KRW,
  PRO_TRIAL_DAYS,
  FREE_PLANNER_PDF_LIMIT,
} from "@/lib/entitlements/constants";
export {
  PRO_DISCOUNT_PERCENT,
  getProDiscountPercent,
  discountedProPriceKrw,
  getProPriceDisplay,
  formatProMonthlyPriceKo,
  formatProMonthlyPriceEn,
  formatProCardPriceLabel,
  proPriceFaqAnswerKo,
  proPriceFaqAnswerEn,
} from "@/lib/entitlements/pricing";

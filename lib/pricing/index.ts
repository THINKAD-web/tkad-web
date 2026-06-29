/**
 * 견적·매체 가격의 **공개 단일 진입점** (원화 환산, 라인 공급가, 합계·부가세).
 *
 * - DB `Media.price` 원 단위: `catalogPriceFieldToWon` (하위: `lib/media-price-format.ts`)
 * - 어드민 견적 라인·할인·부가세: `lineSupplyWon`, `computeAdminQuoteTotals` (하위: `lib/admin-quote-calc.ts`)
 */
export { ADMIN_QUOTE_VALIDITY_DAYS } from "./constants";
export {
  catalogPriceFieldToWon,
  catalogPriceFieldToPriceMan,
  formatBudgetManwon,
  formatCatalogPriceFieldWon,
  formatCatalogPriceFieldCompact,
  formatCatalogPricesSumWon,
  formatCpmKrw,
  formatMediaPrice,
  formatMediaPriceCompactWon,
  formatMediaPriceWon,
  formatMediaPriceWonWithSymbol,
} from "@/lib/media-price-format";
export {
  inclusiveCampaignDays,
  monthFactorFromDays,
  lineSupplyWon,
  computeAdminQuoteTotals,
  formatAdminQuoteDiscountSummary,
  formatQuoteValidUntilLabel,
} from "@/lib/admin-quote-calc";
export type { AdminQuoteTotals } from "@/lib/admin-quote-calc";

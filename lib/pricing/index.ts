/**
 * 견적·매체 가격의 **공개 단일 진입점** (원화 환산, 라인 공급가, 합계·부가세).
 *
 * - DB `Media.price` 만원/원 판별: `catalogPriceFieldToWon` (하위: `lib/media-price-format.ts`)
 * - 어드민 견적 라인·할인·부가세: `lineSupplyWon`, `computeAdminQuoteTotals` (하위: `lib/admin-quote-calc.ts`)
 *
 * Planner·공개 quote 등은 각 UI에서 이 모듈(또는 직접 `media-price-format` / `admin-quote-calc`)을 참조하도록 맞추면
 * "단일 진실"을 유지하기 쉽다.
 */
export { ADMIN_QUOTE_VALIDITY_DAYS } from "./constants";
export {
  catalogPriceFieldToWon,
  catalogPriceFieldToPriceMan,
  formatCatalogPriceFieldWon,
  formatMediaPriceWonWithSymbol,
} from "@/lib/media-price-format";
export {
  inclusiveCampaignDays,
  monthFactorFromDays,
  lineSupplyWon,
  computeAdminQuoteTotals,
} from "@/lib/admin-quote-calc";
export type { AdminQuoteTotals } from "@/lib/admin-quote-calc";

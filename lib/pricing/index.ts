/**
 * 가격 계산 단일 진실(single source of truth).
 *
 * Planner / 견적 마법사 / PDF / 어드민 모두 이 모듈을 거쳐 동일한 합계를 산출한다.
 *
 * - `unit.ts`         : 카탈로그 정수 가격 → 원(KRW) 정규화, 일 단가 환산.
 * - `discount-policy` : 장기·다중 매체 할인(큰 쪽만 적용).
 * - `multipliers`     : 시간대·시즌 가중치(현재 1.0, 정책 채택 후 교체).
 * - `campaign`        : 캠페인 일수, 라인/총액 계산.
 *
 * 단위·정책 변경은 본 디렉터리에서만 수정하고 호출처는 손대지 않는다. 자세한 정책은
 * docs/pricing-policy.md 참조.
 */

export {
  priceToWon,
  priceToDailyKrw,
  networkMonthlyKrw,
  type PriceUnitHint,
} from "./unit";

export {
  selectDiscount,
  DURATION_TIERS,
  MULTI_MEDIA_TIER,
  type DiscountTier,
  type DiscountReason,
} from "./discount-policy";

export {
  timeSlotMultiplier,
  seasonalMultiplier,
  combinedMultiplier,
  type TimeSlotKey,
  type MultiplierContext,
} from "./multipliers";

export {
  inclusiveCampaignDays,
  computeLineKrw,
  computeQuoteTotals,
  VAT_RATE,
  type LineInput,
  type LineResult,
  type QuoteTotals,
} from "./campaign";

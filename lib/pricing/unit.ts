import { catalogPriceFieldToWon } from "@/lib/media-price-format";
import type { MediaPricePeriodKey } from "@/lib/media-data";

/**
 * 카탈로그 정수 가격 → 원(KRW) 변환 시 적용할 단위 힌트.
 *
 * - `won`: 정수가 이미 원 단위.
 * - `man`: 정수가 만원 단위(₩1만 단위).
 * - `auto`: legacy 휴리스틱(>=1,000,000 이면 원, 미만은 만원).
 *   ⚠️ deprecated — DB 단위 마이그레이션 후 제거 예정. 자세한 내용은 docs/pricing-policy.md §1.
 */
export type PriceUnitHint = "won" | "man" | "auto";

/**
 * 카탈로그 `price` 정수를 원(KRW)으로 정규화하는 단일 진입점.
 *
 * 모든 가격 계산은 이 함수를 거쳐 원 단위로 일원화한 뒤 진행한다. 음수·NaN·undefined 는 0 반환.
 */
export function priceToWon(
  price: number,
  hint: PriceUnitHint = "auto",
): number {
  if (!Number.isFinite(price) || price < 0) return 0;
  if (hint === "won") return Math.round(price);
  if (hint === "man") return Math.round(price * 10_000);
  return catalogPriceFieldToWon(price);
}

/**
 * `pricePeriod` 별 일수 환산. 30일 = 1개월(어드민 견적과 동일 규칙).
 */
const DAYS_IN_PERIOD: Record<MediaPricePeriodKey, number> = {
  month: 30,
  biweekly: 14,
  week: 7,
  day: 1,
};

/**
 * 가격 정수 + 기간 → 일 단가(원). day-based 캠페인 계산의 단일 fan-in.
 *
 * `period` 가 비정상이면 month 로 폴백한다. 결과는 소수점 — 표시 시 round 적용.
 */
export function priceToDailyKrw(
  price: number,
  period: MediaPricePeriodKey | string | null | undefined = "month",
  hint: PriceUnitHint = "auto",
): number {
  const won = priceToWon(price, hint);
  const key =
    period && period in DAYS_IN_PERIOD
      ? (period as MediaPricePeriodKey)
      : "month";
  return won / DAYS_IN_PERIOD[key];
}

/**
 * 네트워크 매체 월 가격 정수 → 원(KRW). `computeNetworkMonthlyFromMediaItem` 결과를 감쌀 때 사용.
 */
export function networkMonthlyKrw(
  monthlyPrice: number,
  hint: PriceUnitHint = "auto",
): number {
  return priceToWon(monthlyPrice, hint);
}

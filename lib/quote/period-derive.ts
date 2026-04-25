/**
 * 캠페인 일수 → legacy `periodKey` 추정.
 *
 * 견적 마법사 PR-4 부터 캠페인 기간은 startDate/endDate 가 진실. 단, 기존 PDF
 * 렌더러(`QuotePdfPreview`) 와 OoHQuote 제출 API 가 `periodKey ∈ {1month/3months/6months/12months}`
 * 를 사용하므로, 본 헬퍼로 가까운 키를 매핑한다. 후속 PR(PR-9) 에서 PDF/API 가 일수 기반으로
 * 이전되면 본 헬퍼는 제거한다.
 */
export type LegacyPeriodKey = "1month" | "3months" | "6months" | "12months";

export const LEGACY_PERIOD_DAYS: Record<LegacyPeriodKey, number> = {
  "1month": 30,
  "3months": 90,
  "6months": 180,
  "12months": 365,
};

/**
 * 일수가 위 4 키 중 어디에 가장 가까운지 반환. 정확한 30/90/180/365 가 아니어도
 * "표시용" 으로 가장 가까운 라벨을 골라준다(상한·하한 cap 포함).
 *
 * - 1~45일      → 1month
 * - 46~135일    → 3months
 * - 136~270일   → 6months
 * - 271일 이상   → 12months
 */
export function deriveLegacyPeriodKey(days: number): LegacyPeriodKey {
  if (!Number.isFinite(days) || days <= 0) return "1month";
  if (days <= 45) return "1month";
  if (days <= 135) return "3months";
  if (days <= 270) return "6months";
  return "12months";
}

/** legacy periodMonths 추정(round 30일 단위). PDF의 "월 단가 × 개월" 표기에 사용. */
export function deriveLegacyPeriodMonths(days: number): number {
  if (!Number.isFinite(days) || days <= 0) return 1;
  return Math.max(1, Math.round(days / 30));
}

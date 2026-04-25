/**
 * 장기·다중 매체 할인. 두 정책 중 큰 쪽 한 개만 적용한다(Q2 결정).
 *
 * 운영팀과 협의 후 수정 시: 본 파일의 상수만 갱신하면 견적/Planner 모든 경로에 반영된다.
 * docs/pricing-policy.md §2 참조.
 */

export type DiscountReason = "duration" | "multi_media" | "none";

export type DiscountTier = {
  /** 0–1 비율. 0.05 = 5%. */
  rate: number;
  reason: DiscountReason;
  /** UI/PDF 노출용 한국어 라벨. */
  label: string;
};

/** 일수 기반 할인 — 큰 일수부터 평가하므로 내림차순 유지. */
export const DURATION_TIERS = [
  { minDays: 180, rate: 0.15, label: "180일 이상 장기 할인" },
  { minDays: 90, rate: 0.1, label: "90일 이상 장기 할인" },
  { minDays: 30, rate: 0.05, label: "30일 이상 장기 할인" },
] as const;

/** 매체 수 기반 할인. */
export const MULTI_MEDIA_TIER = {
  minMedia: 5,
  rate: 0.03,
  label: "5개 매체 이상 다중 할인",
} as const;

function durationDiscount(days: number): DiscountTier {
  for (const tier of DURATION_TIERS) {
    if (days >= tier.minDays) {
      return { rate: tier.rate, reason: "duration", label: tier.label };
    }
  }
  return { rate: 0, reason: "none", label: "" };
}

function multiMediaDiscount(mediaCount: number): DiscountTier {
  if (mediaCount >= MULTI_MEDIA_TIER.minMedia) {
    return {
      rate: MULTI_MEDIA_TIER.rate,
      reason: "multi_media",
      label: MULTI_MEDIA_TIER.label,
    };
  }
  return { rate: 0, reason: "none", label: "" };
}

/**
 * 적용할 할인 한 개를 선택한다(중첩 적용 X — 큰 쪽만).
 *
 * 동률(예: 매체 수 + 30일 둘 다 3% 이하)이면 기간 할인을 우선 노출한다.
 */
export function selectDiscount(input: {
  days: number;
  mediaCount: number;
}): DiscountTier {
  const duration = durationDiscount(input.days);
  const multi = multiMediaDiscount(input.mediaCount);
  return duration.rate >= multi.rate ? duration : multi;
}

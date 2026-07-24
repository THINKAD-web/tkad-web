export type MediaRecommendReasonKey =
  | "weekly_popular"
  | "similar_profile"
  | "new_listing"
  | "instant_booking"
  | "personalized";

const LABELS: Record<
  MediaRecommendReasonKey,
  { ko: string; en: string }
> = {
  weekly_popular: {
    ko: "이번 주 가장 많이 찜한 매체",
    en: "Most saved this week",
  },
  similar_profile: {
    ko: "비슷한 조건에서 많이 선택",
    en: "Often chosen with similar specs",
  },
  new_listing: {
    ko: "새로 등록된 매체",
    en: "Newly listed",
  },
  instant_booking: {
    ko: "즉시 예약 안내",
    en: "Instant book (info)",
  },
  personalized: {
    ko: "회원님 취향에 맞춤",
    en: "Matched to your preferences",
  },
};

export function recommendReasonLabel(
  key: MediaRecommendReasonKey,
  locale: string,
): string {
  const isKo = locale.toLowerCase().startsWith("ko");
  return isKo ? LABELS[key].ko : LABELS[key].en;
}

export type MediaWithRecommendReason<T> = T & {
  recommendReason?: string;
  recommendReasonKey?: MediaRecommendReasonKey;
};

export function attachRecommendReason<T extends { id: string }>(
  items: T[],
  key: MediaRecommendReasonKey,
  locale: string,
): MediaWithRecommendReason<T>[] {
  const label = recommendReasonLabel(key, locale);
  return items.map((item) => ({
    ...item,
    recommendReason: label,
    recommendReasonKey: key,
  }));
}

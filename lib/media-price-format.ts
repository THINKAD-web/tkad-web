import type { MediaPricePeriodKey } from "@/lib/media-data";

/** DB·카탈로그 `price`는 원(₩) 단위 */
export function formatMediaPriceWon(wonUnits: number, locale = "ko-KR"): string {
  return `${wonUnits.toLocaleString(locale)}원`;
}

export function formatMediaPriceWonWithSymbol(
  wonUnits: number,
  locale = "ko-KR",
): string {
  return `₩${wonUnits.toLocaleString(locale)}`;
}

export function normalizeMediaPricePeriod(
  v: string | undefined | null,
): MediaPricePeriodKey {
  if (v === "biweekly" || v === "week" || v === "day" || v === "month") {
    return v;
  }
  return "month";
}

export function mediaPricePeriodTranslationKey(
  p: MediaPricePeriodKey | undefined,
):
  | "pricePeriodMonth"
  | "pricePeriodBiweekly"
  | "pricePeriodWeek"
  | "pricePeriodDay" {
  switch (p ?? "month") {
    case "biweekly":
      return "pricePeriodBiweekly";
    case "week":
      return "pricePeriodWeek";
    case "day":
      return "pricePeriodDay";
    default:
      return "pricePeriodMonth";
  }
}

/**
 * 상세·히어로 등 가격 옆 기간 문구 (비정상 `pricePeriod`는 month로 폴백).
 * ko: 월 / 2주 / 주 / 일 — 영문: per month / per 2 weeks / …
 */
export function formatPricePeriodShortLabel(
  period: MediaPricePeriodKey | string | null | undefined,
  locale: string,
): string {
  const p = normalizeMediaPricePeriod(period);
  const isKo = locale === "ko";
  if (isKo) {
    switch (p) {
      case "biweekly":
        return "2주";
      case "week":
        return "주";
      case "day":
        return "일";
      default:
        return "월";
    }
  }
  switch (p) {
    case "biweekly":
      return "per 2 weeks";
    case "week":
      return "per week";
    case "day":
      return "per day";
    default:
      return "per month";
  }
}

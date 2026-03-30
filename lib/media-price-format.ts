import type { MediaPricePeriodKey } from "@/lib/media-data";

/** DB·카탈로그 `price`는 만원(₩10,000) 단위 */
export function mediaPriceManUnitToWon(manUnits: number): number {
  return Math.round(manUnits * 10_000);
}

export function formatMediaPriceWon(manUnits: number, locale = "ko-KR"): string {
  return `${mediaPriceManUnitToWon(manUnits).toLocaleString(locale)}원`;
}

export function formatMediaPriceWonWithSymbol(
  manUnits: number,
  locale = "ko-KR",
): string {
  return `₩${formatMediaPriceWon(manUnits, locale)}`;
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

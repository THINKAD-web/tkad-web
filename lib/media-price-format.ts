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

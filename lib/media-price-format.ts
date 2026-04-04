import type { MediaPricePeriodKey } from "@/lib/media-data";

/**
 * 카탈로그/JSON 가격 숫자 해석.
 * - `1_000_000` 이상: 원(KRW)으로 간주
 * - 그 미만: 만원(월 단가 등)으로 간주해 원으로 환산
 */
export function catalogPriceFieldToWon(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  if (value >= 1_000_000) return Math.round(value);
  return Math.round(value * 10_000);
}

/** 견적·합계용 — 카탈로그와 동일한 «만원(₩1만 단위)» 숫자 */
export function catalogPriceFieldToPriceMan(value: number): number {
  return catalogPriceFieldToWon(value) / 10_000;
}

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

export function formatCatalogPriceFieldWon(
  value: number,
  locale = "ko-KR",
): string {
  if (!value || value <= 0) return "문의";
  return formatMediaPriceWonWithSymbol(catalogPriceFieldToWon(value), locale);
}

/**
 * 상세·모달용: 한국어 locale에서는 `60,000,000원` 형태(통화 기호 없이), 그 외는 ₩ 표기.
 */
export function formatCatalogPriceKrwLong(
  value: number,
  locale: string,
): string {
  const won = catalogPriceFieldToWon(value);
  const isKo = locale === "ko" || locale.startsWith("ko");
  if (isKo) {
    return `${won.toLocaleString("ko-KR")}원`;
  }
  return formatMediaPriceWonWithSymbol(won, "en-US");
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

/** `media.detail` 번역 키 — 매체 상세 가격 옆 기간 문구(1개월·2주·4주·1일 등) */
export function mediaDetailPricePeriodTranslationKey(
  period: MediaPricePeriodKey | string | null | undefined,
):
  | "pricePeriodDisplayMonth"
  | "pricePeriodDisplayBiweekly"
  | "pricePeriodDisplayWeek"
  | "pricePeriodDisplayDay" {
  switch (normalizeMediaPricePeriod(period)) {
    case "biweekly":
      return "pricePeriodDisplayBiweekly";
    case "week":
      return "pricePeriodDisplayWeek";
    case "day":
      return "pricePeriodDisplayDay";
    default:
      return "pricePeriodDisplayMonth";
  }
}

import type { MediaItem, MediaPricePeriodKey } from "@/lib/media-data";

/**
 * DB `Media.price` / 카탈로그 가격 필드 → 원(KRW).
 * 정책: DB는 항상 원 단위 (700_000 = 70만원).
 */
export function catalogPriceFieldToWon(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value);
}

/** 견적·합계용 — 월 단가 만원(₩1만) 숫자 */
export function catalogPriceFieldToPriceMan(value: number): number {
  return catalogPriceFieldToWon(value) / 10_000;
}

/**
 * DB 원 단위 가격 → 공개 UI 표기.
 * - 100만원 미만: ₩50만
 * - 100~9,999만원: ₩1,500만
 * - 1억 이상: ₩1.2억
 */
export function formatMediaPrice(price: number, locale = "ko-KR"): string {
  const won = catalogPriceFieldToWon(price);
  return formatMediaPriceCompactWon(won, locale);
}

/**
 * 원화 컴팩트 표기 (입력값은 이미 원 단위).
 */
export function formatMediaPriceCompactWon(
  wonUnits: number,
  locale = "ko-KR",
): string {
  if (!Number.isFinite(wonUnits) || wonUnits <= 0) {
    return locale.startsWith("ko") ? "문의" : "Inquire";
  }

  const isKo = locale.startsWith("ko");
  const man = wonUnits / 10_000;

  if (isKo) {
    if (man >= 10_000) {
      const eok = man / 10_000;
      const eokText =
        eok >= 10
          ? Math.round(eok).toLocaleString("ko-KR")
          : (Math.round(eok * 10) / 10).toLocaleString("ko-KR");
      return `₩${eokText}억`;
    }
    if (man >= 1000) {
      return `₩${Math.round(man).toLocaleString("ko-KR")}만`;
    }
    return `₩${Math.round(man)}만`;
  }

  if (wonUnits >= 100_000_000) {
    const b = wonUnits / 100_000_000;
    return `₩${b >= 10 ? Math.round(b) : Math.round(b * 10) / 10}B`;
  }
  if (wonUnits >= 1_000_000) {
    return `₩${Math.round(wonUnits / 1_000_000)}M`;
  }
  return `₩${Math.round(wonUnits).toLocaleString("en-US")}`;
}

/** CPM 등 천회당 소액 원화 — 만원 단위로 올리지 않음 */
export function formatCpmKrw(cpmWon: number, locale = "ko-KR"): string {
  if (!Number.isFinite(cpmWon) || cpmWon <= 0) {
    return locale.startsWith("ko") ? "—" : "—";
  }
  const loc = locale.startsWith("ko") ? "ko-KR" : "en-US";
  return `₩${Math.round(cpmWon).toLocaleString(loc)}`;
}

/** 플래너 예산(만원) → 컴팩트 ₩ 표기 */
export function formatBudgetManwon(budgetMan: number, locale = "ko-KR"): string {
  if (!Number.isFinite(budgetMan) || budgetMan <= 0) {
    return locale.startsWith("ko") ? "문의" : "Inquire";
  }
  return formatMediaPriceCompactWon(Math.round(budgetMan * 10_000), locale);
}

/** 원(₩) 단위 — 컴팩트 ₩ 표기 */
export function formatMediaPriceWonWithSymbol(
  wonUnits: number,
  locale = "ko-KR",
): string {
  return formatMediaPriceCompactWon(wonUnits, locale);
}

/** 원(₩) 단위 — 컴팩트 + «원» 접미 (PDF·견적서 등) */
export function formatMediaPriceWon(wonUnits: number, locale = "ko-KR"): string {
  const compact = formatMediaPriceCompactWon(wonUnits, locale);
  if (locale.startsWith("ko")) {
    return `${compact.replace(/^₩/, "")}원`;
  }
  return compact;
}

/** 카탈로그 `price` 필드(원) → 컴팩트 ₩ */
export function formatCatalogPriceFieldWon(
  value: number,
  locale = "ko-KR",
): string {
  return formatMediaPrice(value, locale);
}

/** @deprecated alias — `formatCatalogPriceFieldWon` 과 동일 */
export function formatCatalogPriceFieldCompact(
  value: number,
  locale = "ko-KR",
): string {
  return formatMediaPrice(value, locale);
}

/** 여러 카탈로그 가격 합계(원) → 컴팩트 ₩ */
export function formatCatalogPricesSumWon(
  values: readonly number[],
  locale = "ko-KR",
): string {
  const total = values.reduce((s, v) => s + catalogPriceFieldToWon(v), 0);
  return formatMediaPriceCompactWon(total, locale);
}

/**
 * 상세·모달용 — 공개 UI와 동일한 컴팩트 표기.
 */
export function formatCatalogPriceKrwLong(
  value: number,
  locale: string,
): string {
  return formatMediaPrice(value, locale);
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

export function formatMediaPriceWithPeriodSuffix(
  price: number,
  period: MediaPricePeriodKey | string | null | undefined,
  locale = "ko-KR",
): string {
  const won = catalogPriceFieldToWon(price);
  if (won <= 0) {
    return locale.startsWith("ko") ? "문의" : "Inquire";
  }
  const priceLabel = formatMediaPriceCompactWon(won, locale);
  const periodLabel = formatPricePeriodShortLabel(
    period,
    locale.startsWith("ko") ? "ko" : "en",
  );
  return `${priceLabel}/${periodLabel}`;
}

/** 목록·지도 공통 — priceOptions 포함 최저가 + 표시 기간 */
export function resolveMediaDisplayPrice(
  media: Pick<MediaItem, "price" | "pricePeriod" | "priceOptions">,
): { priceWon: number; period: MediaPricePeriodKey } {
  const cheapest = getCheapestMediaPriceOption(media);
  if (cheapest) {
    return { priceWon: cheapest.priceWon, period: cheapest.period };
  }
  return {
    priceWon: catalogPriceFieldToWon(media.price ?? 0),
    period: normalizeMediaPricePeriod(media.pricePeriod),
  };
}

export function formatMediaDisplayPrice(
  media: Pick<MediaItem, "price" | "pricePeriod" | "priceOptions">,
  locale = "ko-KR",
): string {
  const { priceWon, period } = resolveMediaDisplayPrice(media);
  return formatMediaPriceWithPeriodSuffix(priceWon, period, locale);
}

/**
 * 매체의 priceOptions + 기본 price 중 가장 저렴한 옵션 반환.
 */
export function getCheapestMediaPriceOption(
  media: Pick<MediaItem, "price" | "pricePeriod" | "priceOptions">,
): { priceWon: number; period: MediaPricePeriodKey } | null {
  type Cand = { rawPrice: number; period: MediaPricePeriodKey };
  const candidates: Cand[] = [];

  if (typeof media.price === "number" && media.price > 0) {
    candidates.push({
      rawPrice: media.price,
      period: normalizeMediaPricePeriod(media.pricePeriod),
    });
  }
  for (const opt of media.priceOptions ?? []) {
    if (typeof opt.price === "number" && opt.price > 0) {
      candidates.push({
        rawPrice: opt.price,
        period: normalizeMediaPricePeriod(opt.period ?? media.pricePeriod),
      });
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort(
    (a, b) => catalogPriceFieldToWon(a.rawPrice) - catalogPriceFieldToWon(b.rawPrice),
  );
  const cheapest = candidates[0];
  return {
    priceWon: catalogPriceFieldToWon(cheapest.rawPrice),
    period: cheapest.period,
  };
}

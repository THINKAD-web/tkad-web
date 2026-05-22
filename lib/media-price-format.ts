import type { MediaItem, MediaPricePeriodKey } from "@/lib/media-data";

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

/**
 * 원화 컴팩트 표기 (사이트 공통 표준).
 * - 100만원 미만: ₩50만
 * - 100~9,999만원: ₩1,500만
 * - 1억 이상: ₩1.2억
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
    if (man >= 100) {
      return `₩${Math.round(man).toLocaleString("ko-KR")}만`;
    }
    return `₩${Math.round(man)}만`;
  }

  if (wonUnits >= 100_000_000) {
    const b = wonUnits / 100_000_000;
    return `₩${b >= 10 ? Math.round(b) : (Math.round(b * 10) / 10)}B`;
  }
  if (wonUnits >= 1_000_000) {
    return `₩${Math.round(wonUnits / 1_000_000)}M`;
  }
  return `₩${Math.round(wonUnits).toLocaleString("en-US")}`;
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

/** 카탈로그 `price` 필드(만원/원 혼재) → 컴팩트 ₩ */
export function formatCatalogPriceFieldWon(
  value: number,
  locale = "ko-KR",
): string {
  if (!value || value <= 0) {
    return locale.startsWith("ko") ? "문의" : "Inquire";
  }
  return formatMediaPriceCompactWon(catalogPriceFieldToWon(value), locale);
}

/** @deprecated alias — `formatCatalogPriceFieldWon` 과 동일 */
export function formatCatalogPriceFieldCompact(
  value: number,
  locale = "ko-KR",
): string {
  return formatCatalogPriceFieldWon(value, locale);
}

/** 여러 카탈로그 가격 합계(만원 단위 합) → 컴팩트 ₩ */
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
  return formatCatalogPriceFieldWon(value, locale);
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

/**
 * 매체의 priceOptions + 기본 price 중 가장 저렴한 옵션 반환.
 *
 * 카탈로그 (`/media`, region/type/area 랜딩, recently-viewed 등) 에서
 * "가장 저렴한 가격부터" 노출하는 데 사용.
 *
 * 비교 정책:
 *   - `media.price` 와 `media.priceOptions[].price` 를 모두 후보에 포함
 *   - 가격 단위(catalogPriceFieldToWon) 정규화 후 *원 단위* 로 비교
 *   - 같은 옵션 기간(period) 내 비교 — period 별 정규화는 안 함 (raw 가격 비교)
 *     → 일별/주별/월별 상관없이 가장 작은 절대값을 표시 ("최저가부터" 컨셉)
 *   - 후보 0건이면 null
 *
 * 반환 형식: priceWon(원 단위, formatMediaPriceWonWithSymbol 에 그대로 전달 가능)
 *           + period (없으면 월 기본).
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

  // 원 단위로 정규화 후 가장 작은 값 선택
  candidates.sort(
    (a, b) => catalogPriceFieldToWon(a.rawPrice) - catalogPriceFieldToWon(b.rawPrice),
  );
  const cheapest = candidates[0];
  return {
    priceWon: catalogPriceFieldToWon(cheapest.rawPrice),
    period: cheapest.period,
  };
}

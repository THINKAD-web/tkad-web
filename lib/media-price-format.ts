import type {
  MediaItem,
  MediaPriceOption,
  MediaPricePeriodKey,
} from "@/lib/media-data";
import { isAddonSurchargePriceOption } from "@/lib/media-price-addon-option";

/**
 * DB `Media.price` / 카탈로그 가격 필드 → 원(KRW).
 * 정책: DB는 항상 원 단위 (700_000 = 70만원).
 */
export function catalogPriceFieldToWon(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value);
}

/** 공개 단가 미공개(displayWon≤0) — "₩0" 대신 쓰는 문의 표기 */
export function mediaPriceOnInquiryLabel(locale = "ko-KR"): string {
  return locale.startsWith("ko") ? "가격 문의" : "Price on request";
}

/** 견적·합계용 — 월 단가 만원(₩1만) 숫자 */
export function catalogPriceFieldToPriceMan(value: number): number {
  return catalogPriceFieldToWon(value) / 10_000;
}

/**
 * DB 원 단위 가격 → 공개 UI 표기.
 * - 1원~9,999원: ₩500 (만원 반올림으로 0·과대표시 방지)
 * - 1만~999만: ₩50만
 * - 1,000만~9,999만: ₩1,500만
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
    return mediaPriceOnInquiryLabel(locale);
  }

  const isKo = locale.startsWith("ko");
  const won = Math.round(wonUnits);

  // 만원 미만: 원 단위 폴백 (₩0만 / ₩1만 과대 반올림 방지). EN과 동일 톤.
  if (won < 10_000) {
    const loc = isKo ? "ko-KR" : "en-US";
    return `₩${won.toLocaleString(loc)}`;
  }

  const man = won / 10_000;

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
  if (!Number.isFinite(wonUnits) || wonUnits <= 0) {
    return mediaPriceOnInquiryLabel(locale);
  }
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

/** 번역 키 없이 기간 문구 직접 반환 (priceOptions 카드 등) */
export function formatMediaDetailPricePeriodDisplay(
  period: MediaPricePeriodKey | string | null | undefined,
  locale: string,
): string {
  const isKo = locale === "ko" || locale.startsWith("ko");
  switch (normalizeMediaPricePeriod(period)) {
    case "biweekly":
      return isKo ? "2주" : "2 weeks";
    case "week":
      return isKo ? "4주" : "4 weeks";
    case "day":
      return isKo ? "1일" : "1 day";
    default:
      return isKo ? "1개월" : "1 month";
  }
}

function extractDurationLabelFromPriceOptionLabel(
  label: string,
  locale: string,
): string | null {
  const text = label.trim();
  if (!text) return null;
  const isKo = locale === "ko" || locale.startsWith("ko");

  if (isKo) {
    const month = text.match(/(\d+)\s*개월/);
    if (month) return `${month[1]}개월`;
    const week = text.match(/(\d+)\s*주/);
    if (week) return `${week[1]}주`;
    const day = text.match(/(\d+)\s*일/);
    if (day) return `${day[1]}일`;
    return null;
  }

  const month = text.match(/(\d+)\s*months?/i);
  if (month) {
    return `${month[1]} month${month[1] === "1" ? "" : "s"}`;
  }
  const week = text.match(/(\d+)\s*weeks?/i);
  if (week) {
    return `${week[1]} week${week[1] === "1" ? "" : "s"}`;
  }
  const day = text.match(/(\d+)\s*days?/i);
  if (day) {
    return `${day[1]} day${day[1] === "1" ? "" : "s"}`;
  }
  return null;
}

function inferMediaPricePeriodKeyFromOptionLabel(
  label: string,
): MediaPricePeriodKey | null {
  const text = label.trim();
  if (!text) return null;
  if (/(\d+)\s*일/.test(text) || /(\d+)\s*days?/i.test(text)) return "day";
  if (/(\d+)\s*주/.test(text) || /(\d+)\s*weeks?/i.test(text)) return "week";
  if (/(\d+)\s*개월/.test(text) || /(\d+)\s*months?/i.test(text)) return "month";
  if (/2\s*주|biweekly|bi-weekly/i.test(text)) return "biweekly";
  return null;
}

/**
 * priceOption 단가 주기 — 라벨(예: 최소 7일 패키지)이 `period`보다 구체적이면 라벨 우선.
 */
export function inferMediaPricePeriodFromPriceOption(
  option: Pick<MediaPriceOption, "label" | "period"> | null | undefined,
  fallbackPeriod: MediaPricePeriodKey | string | null | undefined,
): MediaPricePeriodKey {
  if (option?.label?.trim()) {
    const fromLabel = inferMediaPricePeriodKeyFromOptionLabel(option.label);
    if (fromLabel) return fromLabel;
  }
  if (option?.period) {
    return normalizeMediaPricePeriod(option.period);
  }
  return normalizeMediaPricePeriod(fallbackPeriod);
}

/**
 * priceOption 카드 금액 하단 기간 — 옵션 `period` 또는 라벨(예: 20초 3일)에서 추론.
 * 라벨에 기간이 있으면 `period`(또는 매체 기본 month)보다 라벨을 우선한다.
 */
export function resolveMediaPriceOptionPeriodLabel(
  option: Pick<MediaPriceOption, "label" | "period">,
  fallbackPeriod: MediaPricePeriodKey | string | null | undefined,
  locale: string,
): string | null {
  const fromLabel = extractDurationLabelFromPriceOptionLabel(
    option.label,
    locale,
  );
  if (fromLabel) return fromLabel;

  if (option.period) {
    return formatMediaDetailPricePeriodDisplay(option.period, locale);
  }

  if (
    /(\d+\s*(?:일|주|개월)|\d+\s*(?:days?|weeks?|months?))/i.test(
      option.label,
    )
  ) {
    return null;
  }

  return formatMediaDetailPricePeriodDisplay(fallbackPeriod, locale);
}

/** 공개 매체·광고 단가 안내 — 제작비·부가세 별도 */
export function mediaPriceExclNoteText(isKo = true): string {
  return isKo ? "제작비·부가세 별도" : "Production & VAT extra";
}

export function formatMediaPriceWithPeriodSuffix(
  price: number,
  period: MediaPricePeriodKey | string | null | undefined,
  locale = "ko-KR",
): string {
  const won = catalogPriceFieldToWon(price);
  if (won <= 0) {
    return mediaPriceOnInquiryLabel(locale);
  }
  const priceLabel = formatMediaPriceCompactWon(won, locale);
  const periodLabel = formatPricePeriodShortLabel(
    period,
    locale.startsWith("ko") ? "ko" : "en",
  );
  return `${priceLabel}/${periodLabel}`;
}

/** 카드·예산 비교용 — 단가 주기 → 월 환산(원). matching-engine 과 동일 계수. */
export function priceToMonthlyEquivalentWon(
  priceWon: number,
  period: MediaPricePeriodKey | string | null | undefined,
): number {
  const won = catalogPriceFieldToWon(priceWon);
  if (won <= 0) return 0;
  switch (normalizeMediaPricePeriod(period)) {
    case "day":
      return won * 30;
    case "week":
      return won * 4;
    case "biweekly":
      return won * 2;
    default:
      return won;
  }
}

export function isNonMonthlyPricePeriod(
  period: MediaPricePeriodKey | string | null | undefined,
): boolean {
  return normalizeMediaPricePeriod(period) !== "month";
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

/** 표시 단가 ≤0 (양수 priceOptions 없으면 문의 매체) */
export function isMediaPriceOnInquiry(
  media: Pick<MediaItem, "price" | "pricePeriod" | "priceOptions">,
): boolean {
  return resolveMediaDisplayPrice(media).priceWon <= 0;
}

/** 저가/고가 정렬용 — 표시가를 월 환산한 키 */
export type MediaPriceSortable = Pick<
  MediaItem,
  "price" | "pricePeriod" | "priceOptions"
> & { id?: string };

/**
 * 목록 월환산 정렬 키 — `resolveMonthlyListPriceWon` 과 동일 식.
 * (media-metrics → price-format 순환 import 방지용; SSOT 진입점은 media-metrics)
 */
export function mediaMonthlyEquivalentSortWon(
  media: MediaPriceSortable,
): number {
  const { priceWon, period } = resolveMediaDisplayPrice(media);
  return priceToMonthlyEquivalentWon(priceWon, period);
}

/** 월 환산가 비교. 동률이면 id로 안정 정렬. */
export function compareMediaByMonthlyEquivalentPrice(
  a: MediaPriceSortable,
  b: MediaPriceSortable,
  direction: "asc" | "desc" = "asc",
): number {
  const am = mediaMonthlyEquivalentSortWon(a);
  const bm = mediaMonthlyEquivalentSortWon(b);
  const diff = direction === "asc" ? am - bm : bm - am;
  if (diff !== 0) return diff;
  return (a.id ?? "").localeCompare(b.id ?? "");
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
 * 가산/할증 옵션은 제외. root가 가산가와 같고 본상품 옵션이 있으면 root도 제외.
 */
export function getCheapestMediaPriceOption(
  media: Pick<MediaItem, "price" | "pricePeriod" | "priceOptions">,
): { priceWon: number; period: MediaPricePeriodKey } | null {
  type Cand = { rawPrice: number; period: MediaPricePeriodKey };
  const opts = media.priceOptions ?? [];
  const positiveOpts = opts.filter(
    (o) => typeof o.price === "number" && o.price > 0,
  );
  const addonOpts = positiveOpts.filter((o) => isAddonSurchargePriceOption(o));
  const baseOpts = positiveOpts.filter((o) => !isAddonSurchargePriceOption(o));
  const hasAddon = addonOpts.length > 0;
  const hasBase = baseOpts.length > 0;
  const addonPrices = new Set(addonOpts.map((o) => o.price));

  const candidates: Cand[] = [];

  const rootPrice = media.price;
  const rootPositive = typeof rootPrice === "number" && rootPrice > 0;
  const rootMatchesAddonOnly =
    hasAddon && hasBase && rootPositive && addonPrices.has(rootPrice);
  if (rootPositive && !rootMatchesAddonOnly) {
    candidates.push({
      rawPrice: rootPrice,
      period: normalizeMediaPricePeriod(media.pricePeriod),
    });
  }

  const optsForCheapest = hasBase ? baseOpts : positiveOpts;
  for (const opt of optsForCheapest) {
    candidates.push({
      rawPrice: opt.price,
      period: normalizeMediaPricePeriod(opt.period ?? media.pricePeriod),
    });
  }

  if (candidates.length === 0) {
    if (rootPositive) {
      return {
        priceWon: catalogPriceFieldToWon(rootPrice),
        period: normalizeMediaPricePeriod(media.pricePeriod),
      };
    }
    return null;
  }

  candidates.sort(
    (a, b) => catalogPriceFieldToWon(a.rawPrice) - catalogPriceFieldToWon(b.rawPrice),
  );
  const cheapest = candidates[0];
  return {
    priceWon: catalogPriceFieldToWon(cheapest.rawPrice),
    period: cheapest.period,
  };
}

/** priceOptions 2개 이상이며 모든 옵션 price가 동일한지 */
export function hasUniformPriceOptions(
  priceOptions: MediaPriceOption[] | undefined | null,
): boolean {
  const opts = priceOptions ?? [];
  if (opts.length < 2) return false;
  const first = opts[0]?.price;
  if (typeof first !== "number" || first <= 0) return false;
  return opts.every((o) => o.price === first);
}

/** 동일 단가 옵션 — 라벨을 "20초/30초" 형태로 결합 */
export function joinUniformPriceOptionLabels(
  priceOptions: MediaPriceOption[],
): string {
  return priceOptions
    .map((o) => o.label.trim())
    .filter(Boolean)
    .join("/");
}

export function uniformPriceOptionsSummary(
  priceOptions: MediaPriceOption[],
): { labelsJoined: string; priceWon: number } | null {
  if (!hasUniformPriceOptions(priceOptions)) return null;
  const labelsJoined = joinUniformPriceOptionLabels(priceOptions);
  const priceWon = catalogPriceFieldToWon(priceOptions[0]?.price ?? 0);
  if (!labelsJoined || priceWon <= 0) return null;
  return { labelsJoined, priceWon };
}

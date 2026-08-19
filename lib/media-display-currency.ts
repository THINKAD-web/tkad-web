/**
 * JJ-1 — 해외 매체 가격 **표시** 전용 (저장·견적·결제는 KRW SSOT 유지).
 */
import { normalizeMediaCountry, type MediaCountryCode } from "@/lib/media-country";
import {
  catalogPriceFieldToWon,
  formatCpmKrw,
  formatMediaPriceCompactWon,
  formatPricePeriodShortLabel,
  mediaPriceOnInquiryLabel,
} from "@/lib/media-price-format";
import type { MediaPricePeriodKey } from "@/lib/media-data";

/** 1 KRW = N JPY (예: 0.1126). env 미설정 시 2026-08-18 시장 근사치. */
const DEFAULT_KRW_JPY_RATE = 0.1126;

/** `KRW_JPY_RATE` 갱신 기준일 (보고서 각주). */
const DEFAULT_KRW_JPY_RATE_AS_OF = "2026-08-18";

/**
 * KRW→JPY 고정환율 (옵션 A).
 * 수동 갱신 필요 — .env.production.example 주석의 갱신일 참고.
 */
export function getKrwJpyRate(): number {
  const raw = process.env.KRW_JPY_RATE?.trim();
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return DEFAULT_KRW_JPY_RATE;
}

/** env `KRW_JPY_RATE_AS_OF` 또는 기본 갱신일 (YYYY-MM-DD). */
export function getKrwJpyRateAsOfDate(): string {
  const raw = process.env.KRW_JPY_RATE_AS_OF?.trim();
  return raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : DEFAULT_KRW_JPY_RATE_AS_OF;
}

export function portfolioHasJapanMedia(
  items: ReadonlyArray<{ country?: string | null }>,
): boolean {
  return items.some((m) => isJapanDisplayCountry(m.country));
}

export function krwWonToJpy(won: number): number {
  const krw = catalogPriceFieldToWon(won);
  if (krw <= 0) return 0;
  return Math.round(krw * getKrwJpyRate());
}

export function isJapanDisplayCountry(
  country: string | null | undefined,
): boolean {
  return normalizeMediaCountry(country ?? "KR") === "JP";
}

/** ¥ 정수 표기 (ja-JP grouping). */
export function formatJpyFromKrwWon(
  won: number,
  locale = "ko-KR",
): string {
  const jpy = krwWonToJpy(won);
  if (jpy <= 0) return mediaPriceOnInquiryLabel(locale);
  return `¥${jpy.toLocaleString("ja-JP")}`;
}

/**
 * 보고서 행 단가 — KRW SSOT primary, JP 매체만 `(¥N)` 병기 (옵션 b).
 * 합계·차트·KPI는 호출부에서 KRW 숫자 그대로 유지.
 */
export function formatKrwPrimaryWithJpyFootnote(
  won: number,
  country: string | null | undefined,
  locale = "ko-KR",
): string {
  const krw = catalogPriceFieldToWon(won);
  if (krw <= 0) return mediaPriceOnInquiryLabel(locale);
  const primary = formatMediaPriceForDisplay(krw, "KR", locale);
  if (!isJapanDisplayCountry(country)) return primary;
  return `${primary} (${formatJpyFromKrwWon(krw, locale)})`;
}

/** JP 매체가 믹스에 있을 때 보고서 각주 (환율·기준일). */
export function formatReportJpyExchangeFootnote(isKo: boolean): string {
  const rate = getKrwJpyRate();
  const asOf = getKrwJpyRateAsOfDate();
  if (isKo) {
    return `일본 매체 ¥ 환산: 1원 = ${rate}엔 (기준일 ${asOf}). 합계·차트·KPI는 원화(KRW) 기준입니다.`;
  }
  return `JPY equivalents for Japan media: 1 KRW = ${rate} JPY (as of ${asOf}). Totals, charts, and KPIs remain in KRW.`;
}

/**
 * 카탈로그·상세 표시용 — country=JP 이면 ¥, 그 외 기존 ₩ compact.
 * `price` 인자는 DB `Media.price` 또는 display SSOT 원화.
 */
export function formatMediaPriceForDisplay(
  priceWon: number,
  country: string | null | undefined,
  locale = "ko-KR",
): string {
  const won = catalogPriceFieldToWon(priceWon);
  if (won <= 0) return mediaPriceOnInquiryLabel(locale);

  if (isJapanDisplayCountry(country)) {
    return formatJpyFromKrwWon(won, locale);
  }

  return formatMediaPriceCompactWon(won, locale);
}

export function formatMediaPriceWithPeriodForDisplay(
  priceWon: number,
  period: MediaPricePeriodKey | string | null | undefined,
  country: string | null | undefined,
  locale = "ko-KR",
): string {
  const won = catalogPriceFieldToWon(priceWon);
  if (won <= 0) return mediaPriceOnInquiryLabel(locale);
  const priceLabel = formatMediaPriceForDisplay(won, country, locale);
  const periodLabel = formatPricePeriodShortLabel(
    period,
    locale.startsWith("ko") ? "ko" : "en",
  );
  return `${priceLabel}/${periodLabel}`;
}

/** Admin ¥ 미리보기 — JP가 아니어도 미리보기용으로 호출 가능 */
export function formatMediaPriceJpyPreview(won: number): string | null {
  const krw = catalogPriceFieldToWon(won);
  if (krw <= 0) return null;
  return formatJpyFromKrwWon(krw, "ko-KR");
}

/** CPM 표시 — country=JP 이면 ¥ (내부 계산값은 KRW CPM 그대로). */
export function formatCpmForDisplay(
  cpmWon: number,
  country: string | null | undefined,
  locale = "ko-KR",
): string {
  if (!Number.isFinite(cpmWon) || cpmWon <= 0) {
    return locale.startsWith("ko") ? "—" : "—";
  }
  if (isJapanDisplayCountry(country)) {
    return formatJpyFromKrwWon(Math.round(cpmWon), locale);
  }
  return formatCpmKrw(Math.round(cpmWon), locale);
}

/**
 * 상세 스티키 «예상 비용» — JP는 ¥, KR은 기존 «약 N만원».
 * 견적 계산(`costWon`)은 KRW SSOT; 표시만 변환한다.
 */
export function formatMediaCostEstimateShort(
  won: number,
  country: string | null | undefined,
  locale: string,
): string {
  const isKo = locale.startsWith("ko");
  if (isJapanDisplayCountry(country)) {
    const yen = formatMediaPriceForDisplay(won, country, locale);
    return isKo ? `약 ${yen}` : `~${yen}`;
  }
  if (won >= 100_000_000) {
    const eok = won / 100_000_000;
    return isKo
      ? `약 ${eok % 1 === 0 ? eok.toFixed(0) : eok.toFixed(1)}억원`
      : `~₩${(won / 1_000_000).toFixed(1)}M`;
  }
  if (won >= 10_000) {
    const man = won / 10_000;
    return isKo
      ? `약 ${man % 1 === 0 ? man.toFixed(0) : man.toFixed(1)}만원`
      : `~₩${won.toLocaleString(locale)}`;
  }
  return isKo
    ? `${won.toLocaleString("ko-KR")}원`
    : `₩${won.toLocaleString("en-US")}`;
}

export function countryDefaultDisplayCurrency(
  country: string | null | undefined,
): "KRW" | "JPY" {
  return isJapanDisplayCountry(country) ? "JPY" : "KRW";
}

export type { MediaCountryCode };

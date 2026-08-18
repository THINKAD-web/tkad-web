/**
 * JJ-1 — 해외 매체 가격 **표시** 전용 (저장·견적·결제는 KRW SSOT 유지).
 */
import { normalizeMediaCountry, type MediaCountryCode } from "@/lib/media-country";
import {
  catalogPriceFieldToWon,
  formatMediaPriceCompactWon,
  formatPricePeriodShortLabel,
  mediaPriceOnInquiryLabel,
} from "@/lib/media-price-format";
import type { MediaPricePeriodKey } from "@/lib/media-data";

/** 1 KRW = N JPY (예: 0.1126). env 미설정 시 2026-08-18 시장 근사치. */
const DEFAULT_KRW_JPY_RATE = 0.1126;

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

export function countryDefaultDisplayCurrency(
  country: string | null | undefined,
): "KRW" | "JPY" {
  return isJapanDisplayCountry(country) ? "JPY" : "KRW";
}

export type { MediaCountryCode };

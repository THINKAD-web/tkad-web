/**
 * 매체 메트릭 SSOT — 월노출 · 목록 월가격 · CPM.
 * 새 계산식을 만들지 말고, 검증된 기존 로직을 여기로 이관한다.
 */
import type { MediaItem } from "@/lib/media-data";
import {
  mediaItemToImpressionsInput,
  resolvePublicMonthlyImpressions,
  type MonthlyImpressionsInput,
} from "@/lib/media-impressions-ssot";
import {
  catalogPriceFieldToWon,
  compareMediaByMonthlyEquivalentPrice,
  mediaMonthlyEquivalentSortWon,
  priceToMonthlyEquivalentWon,
  resolveMediaDisplayPrice,
  type MediaPriceSortable,
} from "@/lib/media-price-format";

/** 일→월 폴백·기간 환산에 쓰는 공용 일수 (quantity 경로 thin wrapper도 이 상수 참조) */
export const MEDIA_DAYS_PER_MONTH = 30;

export type MediaMetricsInput = Pick<
  MediaItem,
  "cpm" | "price" | "impressions" | "monthlyFootTraffic" | "dailyFootTraffic"
> &
  Partial<
    Pick<
      MonthlyImpressionsInput,
      | "engineDailyImpressions"
      | "impressionModelVersion"
      | "mediaType"
      | "mediaSubCategory"
      | "mediaMainCategory"
      | "mediaName"
      | "factSheet"
    >
  >;

export type MediaListPriceInput = MediaPriceSortable;

/** DB stored CPM 이 재계산값과 이 비율 안이면 신뢰 (PR1) */
const CPM_STORED_RATIO_MIN = 0.85;
const CPM_STORED_RATIO_MAX = 1.15;

/**
 * 월간 추정 노출: `impressions` → `monthlyFootTraffic` → 일 유동×30.
 * (이관: ai-recommend-metrics.estimatedMonthlyImpressions)
 */
export function resolveMonthlyImpressions(m: MediaMetricsInput): number {
  return resolvePublicMonthlyImpressions({
    impressions: m.impressions,
    monthlyFootTraffic: m.monthlyFootTraffic,
    dailyFootTraffic: m.dailyFootTraffic,
    engineDailyImpressions: m.engineDailyImpressions,
    impressionModelVersion: m.impressionModelVersion,
    mediaType: m.mediaType,
    mediaSubCategory: m.mediaSubCategory,
    mediaMainCategory: m.mediaMainCategory,
    mediaName: m.mediaName,
    factSheet: m.factSheet,
  });
}

/**
 * 목록/카드/정렬 전용 월 환산가.
 * resolveMediaDisplayPrice + priceToMonthlyEquivalentWon (PR2.5와 동일).
 * quantity·옵션 대수 반영 월가가 필요하면 이 함수를 쓰지 말 것.
 */
export function resolveMonthlyListPriceWon(m: MediaListPriceInput): number {
  const { priceWon, period } = resolveMediaDisplayPrice(m);
  return priceToMonthlyEquivalentWon(priceWon, period);
}

export type MediaDisplayCpmSource = MediaMetricsInput &
  MediaListPriceInput & {
    productPriceWon?: number | null;
    productPriceDays?: number | null;
  };

/**
 * CPM 분자 — 카드·상세·지도와 동일한 **표시가 월 환산**.
 * `productPriceWon`(등록 30일 상품)이 있으면 홈 인기 카드와 동일하게 우선.
 */
export function resolveCpmMonthlyPriceWon(m: MediaDisplayCpmSource): number {
  if (
    typeof m.productPriceWon === "number" &&
    Number.isFinite(m.productPriceWon) &&
    m.productPriceWon > 0
  ) {
    return m.productPriceWon;
  }
  return resolveMonthlyListPriceWon(m);
}

/** UI CPM 입력 — `resolveMediaDisplayPrice` SSOT 분자 */
export function mediaMetricsInputForDisplayCpm(
  m: MediaDisplayCpmSource,
): MediaMetricsInput {
  return {
    cpm: m.cpm,
    price: resolveCpmMonthlyPriceWon(m),
    impressions: m.impressions,
    monthlyFootTraffic: m.monthlyFootTraffic,
    dailyFootTraffic: m.dailyFootTraffic,
  };
}

export function resolveCpmWonForDisplay(m: MediaDisplayCpmSource): number | null {
  return resolveCpmWon(mediaMetricsInputForDisplayCpm(m));
}

/** 카탈로그·벤치마크·상세 — 노출 SSOT + 표시가 CPM (#615/#616) */
export function mediaDisplayCpmSourceFromItem(
  m: MediaItem & {
    productPriceWon?: number | null;
    productPriceDays?: number | null;
  },
): MediaDisplayCpmSource {
  const imp = mediaItemToImpressionsInput(m);
  return {
    cpm: m.cpm,
    price: m.price,
    pricePeriod: m.pricePeriod,
    priceOptions: m.priceOptions,
    productPriceWon: m.productPriceWon,
    productPriceDays: m.productPriceDays,
    impressions: imp.impressions,
    monthlyFootTraffic: imp.monthlyFootTraffic,
    dailyFootTraffic: imp.dailyFootTraffic,
    engineDailyImpressions: imp.engineDailyImpressions,
    impressionModelVersion: imp.impressionModelVersion,
    mediaType: imp.mediaType,
    mediaSubCategory: imp.mediaSubCategory,
    mediaMainCategory: imp.mediaMainCategory,
    mediaName: imp.mediaName,
    factSheet: imp.factSheet,
  };
}

export function resolveCpmWonForDisplayFromMediaItem(
  m: MediaItem & {
    productPriceWon?: number | null;
    productPriceDays?: number | null;
  },
): number | null {
  return resolveCpmWonForDisplay(mediaDisplayCpmSourceFromItem(m));
}

/**
 * 카탈로그 가격 필드 기준 CPM 재계산(원/1000회) — 반올림 전.
 * `m.price`는 **월 환산 광고비(원)** 로 호출한다 (`mediaMetricsInputForDisplayCpm`).
 */
export function estimateCatalogCpmWon(m: MediaMetricsInput): number | null {
  const imp = resolveMonthlyImpressions(m);
  if (imp <= 0) return null;
  const priceWon = catalogPriceFieldToWon(m.price ?? 0);
  if (priceWon <= 0) return null;
  return priceWon / (imp / 1000);
}

/**
 * stored CPM ±15% 검증 후 값 (반올림 전). PR1 resolveDisplayCpmWon 이관.
 */
export function resolveDisplayCpmWon(m: MediaMetricsInput): number | null {
  const recalc = estimateCatalogCpmWon(m);
  if (recalc == null || !Number.isFinite(recalc) || recalc <= 0) return null;

  const stored = m.cpm;
  if (typeof stored !== "number" || !Number.isFinite(stored) || stored <= 0) {
    return recalc;
  }

  const ratio = stored / recalc;
  if (ratio >= CPM_STORED_RATIO_MIN && ratio <= CPM_STORED_RATIO_MAX) {
    return stored;
  }
  return recalc;
}

/**
 * UI·카드용 CPM (원). ±15% 정책 + 정수 반올림.
 * (media-card-metrics.resolveCpmWon 통합)
 */
export function resolveCpmWon(m: MediaMetricsInput): number | null {
  const resolved = resolveDisplayCpmWon(m);
  if (resolved != null && resolved > 0 && Number.isFinite(resolved)) {
    return Math.round(resolved);
  }
  return null;
}

/** 월 노출 수치를 카드·맵 라벨로 */
export function formatMonthlyImpressionsLabel(
  m: MediaMetricsInput,
  isKo: boolean,
): string | null {
  const n = resolveMonthlyImpressions(m);
  if (n <= 0) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (isKo && n >= 10_000) return `${Math.round(n / 10_000)}만`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString(isKo ? "ko-KR" : "en-US");
}

/**
 * 기간 배수 환산 — 목록 표시가(`resolveMonthlyListPriceWon`)와 혼용하지 말 것.
 * (견적 라인·기타 raw 필드 환산에만 사용)
 */
export { priceToMonthlyEquivalentWon };

/** 정렬 비교 — `resolveMonthlyListPriceWon` 과 동일 식 (`mediaMonthlyEquivalentSortWon`) */
export { compareMediaByMonthlyEquivalentPrice, mediaMonthlyEquivalentSortWon };

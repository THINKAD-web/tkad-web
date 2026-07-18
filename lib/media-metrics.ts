/**
 * 매체 메트릭 SSOT — 월노출 · 목록 월가격 · CPM.
 * 새 계산식을 만들지 말고, 검증된 기존 로직을 여기로 이관한다.
 */
import type { MediaItem } from "@/lib/media-data";
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
  const imp = m.impressions ?? m.monthlyFootTraffic;
  if (typeof imp === "number" && Number.isFinite(imp) && imp > 0) {
    return Math.round(imp);
  }
  const d = m.dailyFootTraffic ?? 0;
  return Math.round(Math.max(0, d) * MEDIA_DAYS_PER_MONTH);
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

/**
 * 카탈로그 가격 필드 기준 CPM 재계산(원/1000회) — 반올림 전.
 * 목록 표시가(기간 환산)가 아니라 `m.price` 원 단위를 쓴다 (기존 정책 유지).
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
 * quantity / matching-engine 폴백용 — 기간 배수만 공유.
 * 목록 표시가(resolveMonthlyListPriceWon)와 혼용하지 말 것.
 */
export { priceToMonthlyEquivalentWon };

/** 정렬 비교 — `resolveMonthlyListPriceWon` 과 동일 식 (`mediaMonthlyEquivalentSortWon`) */
export { compareMediaByMonthlyEquivalentPrice, mediaMonthlyEquivalentSortWon };

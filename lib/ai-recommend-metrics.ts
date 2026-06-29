import type { MediaItem } from "@/lib/media-data";
import { catalogPriceFieldToWon } from "@/lib/media-price-format";

/** DB stored CPM 이 재계산값과 이 비율 안이면 신뢰 */
const CPM_STORED_RATIO_MIN = 0.85;
const CPM_STORED_RATIO_MAX = 1.15;

export type DisplayCpmInput = Pick<
  MediaItem,
  "cpm" | "price" | "impressions" | "monthlyFootTraffic" | "dailyFootTraffic"
>;

/** 월간 추정 노출: `impressions` → `monthlyFootTraffic` → 일 유동×30 */
export function estimatedMonthlyImpressions(m: DisplayCpmInput): number {
  const imp = m.impressions ?? m.monthlyFootTraffic;
  if (typeof imp === "number" && Number.isFinite(imp) && imp > 0) {
    return Math.round(imp);
  }
  const d = m.dailyFootTraffic ?? 0;
  return Math.round(Math.max(0, d) * 30);
}

/**
 * CPM (원/1,000회 노출) = 월 광고비(원) ÷ (월 노출 ÷ 1,000).
 * 카탈로그 `price`는 DB 원 단위 — `catalogPriceFieldToWon`과 동일 (보고서·견적 경로).
 */
export function estimatedCpmWon(m: DisplayCpmInput): number | null {
  const imp = estimatedMonthlyImpressions(m);
  if (imp <= 0) return null;
  const priceWon = catalogPriceFieldToWon(m.price);
  if (priceWon <= 0) return null;
  return priceWon / (imp / 1000);
}

/**
 * UI용 CPM: stored 가 재계산 대비 ±15% 밖(특히 1/10 스케일 오류)이면 재계산값 사용.
 * 재계산 불가 시 null — ₩0·비정상 소액 노출 방지.
 */
export function resolveDisplayCpmWon(m: DisplayCpmInput): number | null {
  const recalc = estimatedCpmWon(m);
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

/** 월 노출 수치를 카드·맵 라벨로 (impressions ?? monthlyFootTraffic ?? daily×30 기준) */
export function formatMonthlyImpressionsLabel(
  m: DisplayCpmInput,
  isKo: boolean,
): string | null {
  const n = estimatedMonthlyImpressions(m);
  if (n <= 0) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (isKo && n >= 10_000) return `${Math.round(n / 10_000)}만`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString(isKo ? "ko-KR" : "en-US");
}

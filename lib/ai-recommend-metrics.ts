import type { MediaItem } from "@/lib/media-data";
import { catalogPriceFieldToWon } from "@/lib/media-price-format";

/** 월간 추정 노출: `impressions` → `monthlyFootTraffic` → 일 유동×30 */
export function estimatedMonthlyImpressions(m: MediaItem): number {
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
export function estimatedCpmWon(m: MediaItem): number | null {
  const imp = estimatedMonthlyImpressions(m);
  if (imp <= 0) return null;
  const priceWon = catalogPriceFieldToWon(m.price);
  if (priceWon <= 0) return null;
  return priceWon / (imp / 1000);
}

import type { MediaItem } from "@/lib/media-data";

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
 * CPM (원/1,000회 노출). 카탈로그 `price`는 `ai-media-recommend`와 동일하게 만원 단위로 취급.
 */
export function estimatedCpmWon(m: MediaItem): number | null {
  const imp = estimatedMonthlyImpressions(m);
  if (imp <= 0) return null;
  const p = m.price;
  if (typeof p !== "number" || !Number.isFinite(p) || p <= 0) return null;
  const priceWon = p * 10000;
  return priceWon / (imp / 1000);
}

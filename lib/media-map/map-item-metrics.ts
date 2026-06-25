import { formatMediaPriceCompactWon } from "@/lib/media-price-format";
import type { MapMapItem } from "@/components/media-map/media-map-types";

export function formatMapImpressions(
  item: MapMapItem,
  isKo: boolean,
): string | null {
  const n =
    item.impressions ??
    (item.dailyFootTraffic && item.dailyFootTraffic > 0
      ? item.dailyFootTraffic * 30
      : 0);
  if (!n || n <= 0) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (isKo && n >= 10_000) return `${Math.round(n / 10_000)}만`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString(isKo ? "ko-KR" : "en-US");
}

export function formatMapCpm(item: MapMapItem, locale: string): string | null {
  if (item.cpm && item.cpm > 0) {
    return formatMediaPriceCompactWon(Math.round(item.cpm), locale);
  }
  const imp =
    item.impressions ??
    (item.dailyFootTraffic && item.dailyFootTraffic > 0
      ? item.dailyFootTraffic * 30
      : 0);
  if (imp > 0 && item.price > 0) {
    const cpm = (item.price / imp) * 1000;
    return formatMediaPriceCompactWon(Math.round(cpm), locale);
  }
  return null;
}

/** 목록 카드 썸네일 하단 1줄 — CPM · 월 노출 */
export function buildMapItemMetricLine(
  item: MapMapItem,
  isKo: boolean,
  locale: string,
): string | null {
  const cpm = formatMapCpm(item, locale);
  const impressions = formatMapImpressions(item, isKo);
  if (!cpm && !impressions) return null;
  const parts: string[] = [];
  if (cpm) parts.push(`CPM ${cpm}`);
  if (impressions) {
    parts.push(isKo ? `노출 ${impressions}` : `Reach ${impressions}`);
  }
  return parts.join(" · ");
}

export function buildMapItemMetrics(
  item: MapMapItem,
  isKo: boolean,
  locale: string,
): Array<{ label: string; value: string }> {
  const impressions = formatMapImpressions(item, isKo);
  const cpm = formatMapCpm(item, locale);
  const visibility =
    item.visibilityScore > 0 ? String(item.visibilityScore) : null;
  return [
    impressions
      ? { label: isKo ? "월 노출" : "Monthly reach", value: impressions }
      : null,
    cpm ? { label: "CPM", value: cpm } : null,
    visibility
      ? { label: isKo ? "가시성" : "Visibility", value: visibility }
      : null,
  ].filter((m): m is { label: string; value: string } => m != null);
}

import {
  formatMonthlyImpressionsLabel,
  resolveDisplayCpmWon,
} from "@/lib/ai-recommend-metrics";
import { formatCpmKrw } from "@/lib/media-price-format";
import {
  buildMapItemMetricLine,
  buildCatalogItemMetricLine,
} from "@/lib/media-card-metrics";
import type { MapMapItem } from "@/components/media-map/media-map-types";

export { buildMapItemMetricLine, buildCatalogItemMetricLine };

export function formatMapImpressions(
  item: MapMapItem,
  isKo: boolean,
): string | null {
  return formatMonthlyImpressionsLabel(item, isKo);
}

export function formatMapCpm(item: MapMapItem, locale: string): string | null {
  const cpm = resolveDisplayCpmWon(item);
  if (cpm == null) return null;
  return formatCpmKrw(Math.round(cpm), locale);
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

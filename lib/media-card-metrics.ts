import { formatCpmKrw } from "@/lib/media-price-format";
import {
  formatMonthlyImpressionsLabel,
  resolveDisplayCpmWon,
} from "@/lib/ai-recommend-metrics";
import type { HomeCatalogMediaItem } from "@/lib/media-catalog-types";
import type { MapMapItem } from "@/components/media-map/media-map-types";

type MetricInput = Pick<
  HomeCatalogMediaItem,
  "cpm" | "impressions" | "monthlyFootTraffic" | "dailyFootTraffic"
>;

function formatCpmLine(cpm: number | null | undefined, locale: string): string | null {
  if (cpm == null || !Number.isFinite(cpm) || cpm <= 0) return null;
  return `CPM ${formatCpmKrw(Math.round(cpm), locale)}`;
}

function formatImpressionsLine(
  item: MetricInput,
  isKo: boolean,
): string | null {
  const label = formatMonthlyImpressionsLabel(item, isKo);
  if (!label) return null;
  return isKo ? `노출 ${label}` : `Reach ${label}`;
}

/** 카탈로그·피드 카드 썸네일 하단 1줄 — CPM · 월 노출 */
export function buildCatalogItemMetricLine(
  item: MetricInput,
  isKo: boolean,
  locale: string,
): string | null {
  const cpm =
    item.cpm != null && item.cpm > 0
      ? formatCpmLine(item.cpm, locale)
      : formatCpmLine(resolveDisplayCpmWon(item), locale);
  const impressions = formatImpressionsLine(item, isKo);
  if (!cpm && !impressions) return null;
  return [cpm, impressions].filter(Boolean).join(" · ");
}

export function buildMapItemMetricLine(
  item: MapMapItem,
  isKo: boolean,
  locale: string,
): string | null {
  return buildCatalogItemMetricLine(item, isKo, locale);
}

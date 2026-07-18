import { formatCpmKrw, formatMediaPriceCompactWon } from "@/lib/media-price-format";
import {
  formatMonthlyImpressionsLabel,
  resolveDisplayCpmWon,
} from "@/lib/ai-recommend-metrics";
import type { HomeCatalogMediaItem } from "@/lib/media-catalog-types";
import type { MapMapItem } from "@/components/media-map/media-map-types";

type MetricInput = Pick<
  HomeCatalogMediaItem,
  "cpm" | "price" | "impressions" | "monthlyFootTraffic" | "dailyFootTraffic"
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

/**
 * 목록·지도 카드용 CPM.
 * `resolveDisplayCpmWon`과 동일 — stored `cpm`은 재계산값 ±15% 이내일 때만 신뢰.
 * (구: stored cpm 맹신 → 만 단위 오염값이 목록에만 노출되던 버그 수정)
 */
export function resolveCpmWon(item: MetricInput): number | null {
  const resolved = resolveDisplayCpmWon(item);
  if (resolved != null && resolved > 0 && Number.isFinite(resolved)) {
    return Math.round(resolved);
  }
  return null;
}

/** 카탈로그·피드 카드 썸네일 하단 1줄 — CPM · 월 노출 */
export function buildCatalogItemMetricLine(
  item: MetricInput,
  isKo: boolean,
  locale: string,
): string | null {
  const cpmWon = resolveCpmWon(item);
  const cpm = cpmWon != null ? formatCpmLine(cpmWon, locale) : null;
  const impressions = formatImpressionsLine(item, isKo);
  if (!cpm && !impressions) return null;
  return [cpm, impressions].filter(Boolean).join(" · ");
}

/** 좁은 그리드 셀 — CPM만 축약 표기(숫자 중간 잘림 방지) */
export function buildCatalogItemMetricLineCompact(
  item: MetricInput,
  locale: string,
): string | null {
  const cpmWon = resolveCpmWon(item);
  if (cpmWon == null) return null;
  return `CPM ${formatMediaPriceCompactWon(cpmWon, locale)}`;
}

export function buildMapItemMetricLine(
  item: MapMapItem,
  isKo: boolean,
  locale: string,
): string | null {
  return buildCatalogItemMetricLine(item, isKo, locale);
}

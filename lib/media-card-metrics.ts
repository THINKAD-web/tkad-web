import { formatCpmKrw, formatMediaPriceCompactWon } from "@/lib/media-price-format";
import {
  formatMonthlyImpressionsLabel,
  resolveCpmWon,
  type MediaMetricsInput,
} from "@/lib/media-metrics";
import type { MapMapItem } from "@/components/media-map/media-map-types";

/** 표시가(`price`)와 대표가(`catalogPrice`)가 분리된 카드/지도 입력 */
type MetricInput = MediaMetricsInput & {
  catalogPrice?: number | null;
};

/**
 * CPM 분자 — `catalogPrice`(DB 대표가) 우선, 없으면 `price`.
 * resolveCpmWon 시그니처는 그대로 두고 호출 전 price만 정규화.
 */
export function metricsInputForCatalogCpm(item: MetricInput): MediaMetricsInput {
  const catalog = item.catalogPrice;
  if (typeof catalog === "number" && Number.isFinite(catalog) && catalog > 0) {
    return {
      cpm: item.cpm,
      price: catalog,
      impressions: item.impressions,
      monthlyFootTraffic: item.monthlyFootTraffic,
      dailyFootTraffic: item.dailyFootTraffic,
    };
  }
  return {
    cpm: item.cpm,
    price: item.price,
    impressions: item.impressions,
    monthlyFootTraffic: item.monthlyFootTraffic,
    dailyFootTraffic: item.dailyFootTraffic,
  };
}

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

/** 목록·지도 카드용 CPM — SSOT `lib/media-metrics.resolveCpmWon` */
export { resolveCpmWon };

/** 카탈로그·피드 카드 썸네일 하단 1줄 — CPM · 월 노출 */
export function buildCatalogItemMetricLine(
  item: MetricInput,
  isKo: boolean,
  locale: string,
): string | null {
  const cpmWon = resolveCpmWon(metricsInputForCatalogCpm(item));
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
  const cpmWon = resolveCpmWon(metricsInputForCatalogCpm(item));
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

import { formatMediaPriceCompactWon } from "@/lib/media-price-format";
import { resolveCpmDisplay } from "@/lib/metrics/format";
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

/**
 * 카드 CPM 1줄. 극단값은 `resolveCpmDisplay` 가 "CPM 산정 중" 으로 바꾼다.
 * 값 자체가 없으면 줄을 만들지 않는다 (기존 동작 유지).
 */
function formatCpmLine(cpm: number | null | undefined, locale: string): string | null {
  const display = resolveCpmDisplay(cpm, locale);
  if (display.rawWon == null) return null;
  return display.displayable ? `CPM ${display.text}` : display.text;
}

function formatImpressionsLine(
  item: MetricInput,
  isKo: boolean,
): string | null {
  const label = formatMonthlyImpressionsLabel(item, isKo);
  if (!label) return null;
  return isKo ? `유동 ${label}` : `Footfall ${label}`;
}

/** 목록·지도 카드용 CPM — SSOT `lib/media-metrics.resolveCpmWon` */
export { resolveCpmWon };

/** 카탈로그·피드 카드 썸네일 하단 1줄 — CPM · 월 유동인구(참고) */
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
  const display = resolveCpmDisplay(cpmWon, locale);
  if (display.rawWon == null) return null;
  if (!display.displayable) return display.text;
  return `CPM ${formatMediaPriceCompactWon(cpmWon as number, locale)}`;
}

export function buildMapItemMetricLine(
  item: MapMapItem,
  isKo: boolean,
  locale: string,
): string | null {
  return buildCatalogItemMetricLine(item, isKo, locale);
}

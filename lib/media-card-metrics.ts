import { formatMediaPriceCompactWon } from "@/lib/media-price-format";
import { resolveCpmDisplay } from "@/lib/metrics/format";
import {
  formatMonthlyImpressionsLabel,
  mediaMetricsInputForDisplayCpm,
  resolveCpmWon,
  resolveCpmWonForDisplay,
  type MediaMetricsInput,
} from "@/lib/media-metrics";
import type { MapMapItem } from "@/components/media-map/media-map-types";

/** 카드·지도 — `resolveMediaDisplayPrice` / `productPriceWon` SSOT */
type MetricInput = MediaMetricsInput &
  Pick<
    import("@/lib/media-data").MediaItem,
    "pricePeriod" | "priceOptions"
  > & {
    catalogPrice?: number | null;
    productPriceWon?: number | null;
    productPriceDays?: number | null;
  };

/** @deprecated 이름 유지 — 내부는 display-price SSOT */
export function metricsInputForCatalogCpm(item: MetricInput): MediaMetricsInput {
  return mediaMetricsInputForDisplayCpm({
    cpm: item.cpm,
    price: item.price,
    pricePeriod: item.pricePeriod,
    priceOptions: item.priceOptions,
    productPriceWon: item.productPriceWon,
    productPriceDays: item.productPriceDays,
    impressions: item.impressions,
    monthlyFootTraffic: item.monthlyFootTraffic,
    dailyFootTraffic: item.dailyFootTraffic,
  });
}

/**
 * 카드 CPM 1줄. 극단값은 `resolveCpmDisplay` 가 "CPM 산정 중" 으로 바꾼다.
 * 값 자체가 없으면 줄을 만들지 않는다 (기존 동작 유지).
 */
function formatCpmLine(cpm: number | null | undefined, locale: string): string | null {
  const display = resolveCpmDisplay(cpm, locale);
  if (display.rawWon == null) return null;
  if (!display.displayable) return display.text;
  return `CPM ${display.text}`;
}

function formatImpressionsLine(
  item: MetricInput,
  isKo: boolean,
): string | null {
  const label = formatMonthlyImpressionsLabel(item, isKo);
  if (!label) return null;
  return isKo ? `유동 ${label}` : `Footfall ${label}`;
}

/** 목록·지도 카드용 CPM — SSOT `resolveCpmWonForDisplay` */
export { resolveCpmWon, resolveCpmWonForDisplay };

/** 카탈로그·피드 카드 썸네일 하단 1줄 — CPM · 월 유동인구(참고) */
export function buildCatalogItemMetricLine(
  item: MetricInput,
  isKo: boolean,
  locale: string,
): string | null {
  const cpmWon = resolveCpmWonForDisplay(item);
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
  const cpmWon = resolveCpmWonForDisplay(item);
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

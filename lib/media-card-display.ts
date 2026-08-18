import type { HomeCatalogMediaItem } from "@/lib/media-catalog-types";
import type { MapMapItem } from "@/components/media-map/media-map-types";
import {
  buildCatalogItemMetricLine,
  buildCatalogItemMetricLineCompact,
} from "@/lib/media-card-metrics";
import {
  formatCatalogPriceFieldWon,
  formatMediaPriceWithPeriodSuffix,
  formatPricePeriodShortLabel,
  mediaPriceOnInquiryLabel,
} from "@/lib/media-price-format";

export type MediaCardDisplayModel = {
  id: string;
  name: string;
  type?: string;
  trustScore?: number;
  isVerified?: boolean;
  thumbnailUrl?: string;
  galleryExtraCount: number;
  priceLabel: string;
  showPeriodSuffix: boolean;
  periodLabel?: string | null;
  metricLine?: string | null;
  /** 2열 그리드 등 좁은 셀 — CPM 축약 1줄 */
  metricLineCompact?: string | null;
  highlights: string[];
  detailHref: string;
};

function galleryExtraCount(item: {
  thumbnailUrl?: string;
  galleryImages?: string[];
}): number {
  const seen = new Set<string>();
  let count = 0;
  for (const u of [item.thumbnailUrl, ...(item.galleryImages ?? [])]) {
    const t = u?.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    count += 1;
  }
  return Math.max(0, count - 1);
}

/** Parent `priceLabel` already embeds `/일`·`/월` (or en equivalents). */
export function priceLabelIncludesPeriodSuffix(
  priceLabel: string,
  periodLabel: string,
): boolean {
  const price = priceLabel.trim();
  const period = periodLabel.trim();
  if (!price || !period) return false;
  return price.includes(`/${period}`);
}

export function catalogItemToDisplayModel(
  item: HomeCatalogMediaItem,
  opts: {
    href: string;
    isKo: boolean;
    priceLabel?: string | null;
    highlights?: string[];
  },
): MediaCardDisplayModel {
  const locale = opts.isKo ? "ko-KR" : "en-US";
  const formattedNumericPrice =
    item.price && item.price > 0
      ? formatCatalogPriceFieldWon(item.price, locale, item.country)
      : null;
  const displayPrice =
    opts.priceLabel?.trim() || formattedNumericPrice || null;
  const periodLabel = formatPricePeriodShortLabel(
    item.pricePeriod,
    opts.isKo ? "ko" : "en",
  );

  return {
    id: item.id,
    name: item.name,
    type: item.type,
    trustScore: item.trustScore,
    isVerified: item.isVerified,
    thumbnailUrl: item.thumbnailUrl,
    galleryExtraCount: galleryExtraCount(item),
    priceLabel:
      displayPrice ?? mediaPriceOnInquiryLabel(opts.isKo ? "ko" : "en"),
    showPeriodSuffix: Boolean(
      displayPrice &&
        periodLabel &&
        !priceLabelIncludesPeriodSuffix(displayPrice, periodLabel),
    ),
    periodLabel,
    metricLine: buildCatalogItemMetricLine(item, opts.isKo, locale),
    metricLineCompact: buildCatalogItemMetricLineCompact(item, locale),
    highlights: opts.highlights ?? [],
    detailHref: opts.href,
  };
}

export function mapItemToDisplayModel(
  item: MapMapItem,
  locale: string,
  isKo: boolean,
): MediaCardDisplayModel {
  const priceLabel = formatMediaPriceWithPeriodSuffix(
    item.price,
    item.pricePeriod,
    locale,
    item.country,
  );

  return {
    id: item.id,
    name: item.name,
    type: item.type,
    trustScore: undefined,
    isVerified: item.isVerified,
    thumbnailUrl: item.image ?? undefined,
    galleryExtraCount: 0,
    priceLabel,
    showPeriodSuffix: false,
    periodLabel: null,
    metricLine: buildCatalogItemMetricLine(item, isKo, locale),
    metricLineCompact: buildCatalogItemMetricLineCompact(item, locale),
    highlights: [],
    detailHref: `/media/${item.id}`,
  };
}

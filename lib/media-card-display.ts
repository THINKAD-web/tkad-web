import type { HomeCatalogMediaItem } from "@/lib/media-catalog-types";
import type { MapMapItem } from "@/components/media-map/media-map-types";
import { buildCatalogItemMetricLine } from "@/lib/media-card-metrics";
import {
  formatCatalogPriceFieldWon,
  formatMediaPriceWithPeriodSuffix,
  formatPricePeriodShortLabel,
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
      ? formatCatalogPriceFieldWon(item.price, locale)
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
    priceLabel: displayPrice ?? (opts.isKo ? "문의" : "Inquire"),
    showPeriodSuffix: Boolean(displayPrice && !opts.priceLabel?.trim()),
    periodLabel,
    metricLine: buildCatalogItemMetricLine(item, opts.isKo, locale),
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
    highlights: [],
    detailHref: `/media/${item.id}`,
  };
}

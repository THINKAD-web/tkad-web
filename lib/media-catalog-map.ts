import {
  dedupeImageUrls,
  getPrimaryMediaImageUrl,
  type MediaItem,
  typeLabels,
} from "@/lib/media-data";
import {
  NETWORK_CATALOG_TYPE_LABELS,
  resolveNetworkCatalogType,
  resolveNetworkVenueCode,
  NETWORK_TYPE_LABELS,
} from "@/lib/media-network-types";
import { isInstantBookingEligible } from "@/lib/instant-booking-eligibility";
import {
  filterDisplayableMediaImageUrls,
  resolveCatalogImageSrc,
  resolvePublicMediaImageUrl,
  shouldUseUnoptimizedImage,
} from "@/lib/optimized-image-url";
import { resolveMediaDisplayPrice, normalizeMediaPricePeriod } from "@/lib/media-price-format";
import type { HomeCatalogMediaItem } from "@/lib/media-catalog-types";
import type { MapMapItem } from "@/components/media-map/media-map-types";

/** Prisma/API `MediaItem` → 목록·홈·검색 카드 공통 형식 (SSR·클라이언트 동일 경로) */
export function mapMediaItemToHomeCatalog(item: MediaItem): HomeCatalogMediaItem {
  const rawUrl = getPrimaryMediaImageUrl(item);
  const resolved = rawUrl ? resolveCatalogImageSrc(rawUrl) : null;
  const typeLabel =
    item.catalogSource === "network"
      ? (() => {
          const catalog = resolveNetworkCatalogType(item.networkSubtype ?? item.subCategory);
          const catalogLb = NETWORK_CATALOG_TYPE_LABELS[catalog];
          const venue = resolveNetworkVenueCode(
            item.networkSubtype ?? item.subCategory,
            item.tags,
          );
          const venueLb = venue ? NETWORK_TYPE_LABELS[venue] : null;
          if (venueLb) {
            return `${catalogLb.ko} · ${venueLb.ko}`;
          }
          return catalogLb.ko;
        })()
      : (typeLabels[item.type]?.ko ?? item.type);
  const display = resolveMediaDisplayPrice(item);

  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    type: typeLabel,
    region: item.region ?? item.district ?? item.city,
    location: item.location?.trim() || undefined,
    size: item.size?.trim() || undefined,
    dailyFootTraffic:
      item.dailyFootTraffic && item.dailyFootTraffic > 0
        ? item.dailyFootTraffic
        : undefined,
    impressions:
      item.impressions != null && item.impressions > 0
        ? item.impressions
        : undefined,
    monthlyFootTraffic:
      item.monthlyFootTraffic != null && item.monthlyFootTraffic > 0
        ? item.monthlyFootTraffic
        : undefined,
    cpm:
      item.cpm != null && Number.isFinite(item.cpm) && item.cpm > 0
        ? item.cpm
        : undefined,
    visibilityScore:
      item.visibilityScore != null && item.visibilityScore > 0
        ? item.visibilityScore
        : undefined,
    features:
      item.features?.trim() ||
      item.catalogDescription?.trim() ||
      item.description?.trim() ||
      undefined,
    advertiserHistory: item.advertiserHistory?.trim() || undefined,
    trustScore:
      item.trustScore != null && item.trustScore >= 0
        ? item.trustScore
        : undefined,
    executionCount:
      item.executionCount != null && item.executionCount >= 0
        ? item.executionCount
        : undefined,
    lastExecutionMonthsAgo: item.lastExecutionMonthsAgo ?? undefined,
    price: display.priceWon > 0 ? display.priceWon : undefined,
    pricePeriod: display.period,
    thumbnailUrl: resolved?.src ?? undefined,
    galleryImages: filterDisplayableMediaImageUrls(
      dedupeImageUrls(item.sampleImages ?? []),
    )
      .map((url) => resolvePublicMediaImageUrl(url))
      .filter((url): url is string => Boolean(url))
      .slice(0, 6),
    reviewAvg: item.averageRating,
    reviewCount: item.reviewCount,
    isInstantBooking: isInstantBookingEligible({
      instantBookingEnabled: item.instantBookingEnabled ?? false,
      availability: item.availability,
      catalogSource: item.catalogSource,
    }).eligible,
    popularityScore: item.popularityScore,
    isVerified: item.isVerified === true,
    trustBadges: item.trustBadges,
  };
}

/** 지도 `/media/map` MapMapItem → 목록 카드 공통 형식 */
export function mapMapItemToHomeCatalog(
  item: MapMapItem,
): HomeCatalogMediaItem {
  return {
    id: item.id,
    name: item.name,
    type: item.type,
    region: item.region,
    location: item.location,
    price: item.price > 0 ? item.price : undefined,
    pricePeriod: normalizeMediaPricePeriod(item.pricePeriod),
    thumbnailUrl: item.image
      ? (resolveCatalogImageSrc(item.image)?.src ?? item.image)
      : undefined,
    visibilityScore:
      item.visibilityScore > 0 ? item.visibilityScore : undefined,
    dailyFootTraffic: item.dailyFootTraffic ?? undefined,
    impressions: item.impressions ?? undefined,
    cpm: item.cpm ?? undefined,
    isVerified: item.isVerified,
    isInstantBooking: item.isInstantBooking,
  };
}

/**
 * `HomeCatalogMediaItem` → CPM·성능 지표용 최소 `MediaItem`.
 * `price`는 `mapMediaItemToHomeCatalog` 가 이미 `resolveMediaDisplayPrice` 로 넣은 표시가.
 */
export function catalogToMediaItem(item: HomeCatalogMediaItem): MediaItem {
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    nameEn: item.name,
    location: item.location ?? item.region ?? "",
    locationEn: item.location ?? item.region ?? "",
    region: "seoul",
    type: "digital",
    price: item.price ?? 0,
    pricePeriod: item.pricePeriod,
    lat: 0,
    lng: 0,
    dailyFootTraffic: item.dailyFootTraffic ?? 0,
    impressions: item.impressions,
    monthlyFootTraffic: item.monthlyFootTraffic,
    cpm: item.cpm,
    visibilityScore: item.visibilityScore,
    sampleImages:
      item.galleryImages ?? (item.thumbnailUrl ? [item.thumbnailUrl] : []),
  };
}

/** 목록 카드 `next/image` — Bunny는 same-origin 프록시, 잘못된 URL은 정규화 */
export function catalogThumbnailImageProps(
  thumbnailUrl: string | null | undefined,
): { src: string; unoptimized: boolean } | null {
  return resolveCatalogImageSrc(thumbnailUrl);
}

import {
  getPrimaryMediaImageUrl,
  type MediaItem,
  type MediaPriceOption,
  type MediaPricePeriodKey,
} from "@/lib/media-data";
import { resolveCatalogImageSrc } from "@/lib/optimized-image-url";
import type { MediaTrustBadge } from "@/lib/media-trust";

/** Slim price option — enough for list-card cheapest-price logic */
export type MediaCatalogListPriceOption = Pick<
  MediaPriceOption,
  "label" | "price" | "period" | "description"
>;

/**
 * Browse/list wire DTO for `/api/public/media`.
 * Omits detail-only blobs (descriptions, traffic patterns, install arrays, etc.).
 */
export type MediaCatalogListItem = {
  id: string;
  slug?: string;
  name: string;
  nameEn: string;
  type: string;
  location: string;
  locationEn: string;
  region: string;
  city?: string;
  district?: string;
  country?: string;
  price: number;
  pricePeriod?: MediaPricePeriodKey;
  priceOptions?: MediaCatalogListPriceOption[];
  /** Bunny CDN catalog thumbnail — same path as `catalogThumbnailImageProps` */
  thumbnailUrl?: string;
  catalogSource?: "media" | "network";
  networkSubtype?: string;
  networkTotalLocations?: number;
  networkPricePerUnit?: number | null;
  subCategory?: string;
  /** Browse chip filters — required for in-memory discovery filter/counts */
  regionMain?: string;
  regionSub?: string;
  mediaMainCategory?: string;
  mediaSubCategory?: string;
  mediaCategory?: string[];
  targetCategory?: string[];
  operatingHours?: string;
  tags?: string[];
  isVerified?: boolean;
  averageRating?: number;
  reviewCount?: number;
  trustScore?: number;
  trustBadges?: MediaTrustBadge[];
  executionCount?: number;
  lastExecutionMonthsAgo?: number | null;
  instantBookingEnabled?: boolean;
  availability?: "available" | "reserved" | "maintenance";
  lat: number;
  lng: number;
  coordinatesAreFallback?: boolean;
  dailyFootTraffic?: number;
  impressions?: number;
  monthlyFootTraffic?: number;
  visibilityScore?: number;
  cpm?: number;
  popularityScore?: number;
};

/** Keys allowed on list DTO — used by shape tests */
export const MEDIA_CATALOG_LIST_ITEM_KEYS = [
  "id",
  "slug",
  "name",
  "nameEn",
  "type",
  "location",
  "locationEn",
  "region",
  "city",
  "district",
  "country",
  "price",
  "pricePeriod",
  "priceOptions",
  "thumbnailUrl",
  "catalogSource",
  "networkSubtype",
  "networkTotalLocations",
  "networkPricePerUnit",
  "subCategory",
  "regionMain",
  "regionSub",
  "mediaMainCategory",
  "mediaSubCategory",
  "mediaCategory",
  "targetCategory",
  "operatingHours",
  "tags",
  "isVerified",
  "averageRating",
  "reviewCount",
  "trustScore",
  "trustBadges",
  "executionCount",
  "lastExecutionMonthsAgo",
  "instantBookingEnabled",
  "availability",
  "lat",
  "lng",
  "coordinatesAreFallback",
  "dailyFootTraffic",
  "impressions",
  "monthlyFootTraffic",
  "visibilityScore",
  "cpm",
  "popularityScore",
] as const satisfies readonly (keyof MediaCatalogListItem)[];

function slimPriceOptions(
  opts: MediaPriceOption[] | undefined,
): MediaCatalogListPriceOption[] | undefined {
  if (!opts?.length) return undefined;
  const slim = opts
    .filter((o) => typeof o.price === "number")
    .map(({ label, price, period, description }) => ({
      label,
      price,
      period,
      description,
    }));
  return slim.length > 0 ? slim : undefined;
}

function positiveOrUndefined(n: number | null | undefined): number | undefined {
  return n != null && Number.isFinite(n) && n > 0 ? n : undefined;
}

/** Full catalog row → browse/list API DTO (CDN-resized thumbnail) */
export function mediaItemToCatalogListItem(item: MediaItem): MediaCatalogListItem {
  const rawUrl = getPrimaryMediaImageUrl(item);
  const resolved = rawUrl ? resolveCatalogImageSrc(rawUrl) : null;

  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    nameEn: item.nameEn || item.name,
    type: item.type,
    location: item.location,
    locationEn: item.locationEn || item.location,
    region: item.region,
    city: item.city,
    district: item.district,
    country: item.country,
    price: item.price,
    pricePeriod: item.pricePeriod,
    priceOptions: slimPriceOptions(item.priceOptions),
    thumbnailUrl: resolved?.src ?? undefined,
    catalogSource: item.catalogSource,
    networkSubtype: item.networkSubtype,
    networkTotalLocations: item.networkTotalLocations,
    networkPricePerUnit: item.networkPricePerUnit,
    subCategory: item.subCategory,
    regionMain: item.regionMain,
    regionSub: item.regionSub,
    mediaMainCategory: item.mediaMainCategory,
    mediaSubCategory: item.mediaSubCategory,
    mediaCategory: item.mediaCategory?.length ? item.mediaCategory : undefined,
    targetCategory: item.targetCategory?.length ? item.targetCategory : undefined,
    operatingHours: item.operatingHours,
    tags: item.tags?.length ? item.tags : undefined,
    isVerified: item.isVerified === true ? true : undefined,
    averageRating: positiveOrUndefined(item.averageRating),
    reviewCount: positiveOrUndefined(item.reviewCount),
    trustScore:
      item.trustScore != null && item.trustScore >= 0
        ? item.trustScore
        : undefined,
    trustBadges: item.trustBadges?.length ? item.trustBadges : undefined,
    executionCount:
      item.executionCount != null && item.executionCount >= 0
        ? item.executionCount
        : undefined,
    lastExecutionMonthsAgo: item.lastExecutionMonthsAgo ?? undefined,
    instantBookingEnabled: item.instantBookingEnabled ? true : undefined,
    availability: item.availability,
    lat: item.lat,
    lng: item.lng,
    coordinatesAreFallback: item.coordinatesAreFallback ? true : undefined,
    dailyFootTraffic: positiveOrUndefined(item.dailyFootTraffic),
    impressions: positiveOrUndefined(item.impressions),
    monthlyFootTraffic: positiveOrUndefined(item.monthlyFootTraffic),
    visibilityScore: positiveOrUndefined(item.visibilityScore),
    cpm: positiveOrUndefined(item.cpm),
    popularityScore: positiveOrUndefined(item.popularityScore),
  };
}

export function mediaItemsToCatalogListItems(
  items: MediaItem[],
): MediaCatalogListItem[] {
  return items.map(mediaItemToCatalogListItem);
}

/** List DTO → minimal `MediaItem` for cards/compare that still expect full type */
export function catalogListItemToMediaItem(
  item: MediaCatalogListItem,
): MediaItem {
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    nameEn: item.nameEn,
    location: item.location,
    locationEn: item.locationEn,
    region: item.region,
    city: item.city,
    district: item.district,
    country: item.country,
    type: item.type,
    price: item.price,
    pricePeriod: item.pricePeriod,
    priceOptions: item.priceOptions,
    lat: item.lat,
    lng: item.lng,
    coordinatesAreFallback: item.coordinatesAreFallback,
    dailyFootTraffic: item.dailyFootTraffic ?? 0,
    impressions: item.impressions,
    monthlyFootTraffic: item.monthlyFootTraffic,
    visibilityScore: item.visibilityScore,
    cpm: item.cpm,
    sampleImages: item.thumbnailUrl ? [item.thumbnailUrl] : [],
    catalogSource: item.catalogSource,
    networkSubtype: item.networkSubtype,
    networkTotalLocations: item.networkTotalLocations,
    networkPricePerUnit: item.networkPricePerUnit,
    subCategory: item.subCategory,
    regionMain: item.regionMain,
    regionSub: item.regionSub,
    mediaMainCategory: item.mediaMainCategory,
    mediaSubCategory: item.mediaSubCategory,
    mediaCategory: item.mediaCategory,
    targetCategory: item.targetCategory,
    operatingHours: item.operatingHours,
    tags: item.tags,
    isVerified: item.isVerified,
    averageRating: item.averageRating,
    reviewCount: item.reviewCount,
    trustScore: item.trustScore,
    trustBadges: item.trustBadges,
    executionCount: item.executionCount,
    lastExecutionMonthsAgo: item.lastExecutionMonthsAgo,
    instantBookingEnabled: item.instantBookingEnabled,
    availability: item.availability,
    popularityScore: item.popularityScore,
  };
}

export function catalogListItemsToMediaItems(
  items: MediaCatalogListItem[],
): MediaItem[] {
  return items.map(catalogListItemToMediaItem);
}

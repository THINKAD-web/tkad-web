import {
  fetchHomeFeaturedMedia,
  fetchHomeNewMedia,
  fetchHomeWeeklyPopularMedia,
} from "@/lib/public-media-catalog";
import {
  getPrimaryMediaImageUrl,
  type MediaItem,
  typeLabels,
} from "@/lib/media-data";
import { isInstantBookingEligible } from "@/lib/instant-booking-eligibility";
import { resolveCatalogImageSrc } from "@/lib/optimized-image-url";

export type HomeCatalogMediaItem = {
  id: string;
  slug?: string;
  name: string;
  type?: string;
  region?: string;
  price?: number;
  thumbnailUrl?: string;
  reviewAvg?: number;
  reviewCount?: number;
  isInstantBooking?: boolean;
  popularityScore?: number;
};

export type MediaCatalogSort = "recommended" | "popular" | "newest";

function mapMediaItem(item: MediaItem): HomeCatalogMediaItem {
  const rawUrl = getPrimaryMediaImageUrl(item);
  const resolved = rawUrl ? resolveCatalogImageSrc(rawUrl) : null;
  const typeLabel = typeLabels[item.type]?.ko ?? item.type;

  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    type: typeLabel,
    region: item.region ?? item.district ?? item.city,
    price: item.price > 0 ? item.price : undefined,
    thumbnailUrl: resolved?.src ?? undefined,
    reviewAvg: item.averageRating,
    reviewCount: item.reviewCount,
    isInstantBooking: isInstantBookingEligible(item).eligible,
    popularityScore: item.popularityScore,
  };
}

export async function fetchPublicMediaCatalog(opts: {
  sort: MediaCatalogSort;
  limit?: number;
}): Promise<HomeCatalogMediaItem[]> {
  const limit = opts.limit ?? 10;
  let rows: MediaItem[] = [];

  switch (opts.sort) {
    case "recommended":
      rows = await fetchHomeFeaturedMedia(limit);
      break;
    case "popular":
      rows = await fetchHomeWeeklyPopularMedia(limit);
      break;
    case "newest":
      rows = await fetchHomeNewMedia(limit);
      break;
    default:
      rows = [];
  }

  return rows.map(mapMediaItem);
}

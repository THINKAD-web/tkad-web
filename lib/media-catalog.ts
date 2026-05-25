import {
  fetchHomeFeaturedMedia,
  fetchHomeNewMedia,
  fetchHomeWeeklyPopularMedia,
  prismaMediaToMediaItem,
} from "@/lib/public-media-catalog";
import {
  getPrimaryMediaImageUrl,
  type MediaItem,
  typeLabels,
} from "@/lib/media-data";
import { isInstantBookingEligible } from "@/lib/instant-booking-eligibility";
import { resolveCatalogImageSrc } from "@/lib/optimized-image-url";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import {
  buildPublicMediaOrderBy,
  buildPublicMediaWhere,
  type PublicMediaSort,
} from "@/lib/public-media-query";

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

export type MediaCatalogSort =
  | "recommended"
  | "popular"
  | "newest"
  | "price_asc"
  | "price_desc";

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

function usesFilteredQuery(opts: {
  sort: MediaCatalogSort;
  category?: string;
  target?: string;
  region?: string;
  q?: string;
}): boolean {
  return (
    Boolean(opts.category || opts.target || opts.region || opts.q) ||
    opts.sort === "price_asc" ||
    opts.sort === "price_desc"
  );
}

async function fetchFilteredMediaCatalog(opts: {
  sort: MediaCatalogSort;
  limit: number;
  category?: string;
  target?: string;
  region?: string;
  q?: string;
}): Promise<HomeCatalogMediaItem[]> {
  if (!isDatabaseConfigured()) {
    return [];
  }

  try {
    const db = getPrisma();
    const where = buildPublicMediaWhere({
      category: opts.category,
      target: opts.target,
      region: opts.region,
      q: opts.q,
    });
    const orderBy = buildPublicMediaOrderBy(opts.sort as PublicMediaSort);
    const rows = await db.media.findMany({
      where,
      orderBy,
      take: opts.limit,
    });
    return rows.map((row) => mapMediaItem(prismaMediaToMediaItem(row)));
  } catch (e) {
    console.error("[fetchPublicMediaCatalog] filtered query failed", e);
    return [];
  }
}

export async function fetchPublicMediaCatalog(opts: {
  sort: MediaCatalogSort;
  limit?: number;
  category?: string;
  target?: string;
  region?: string;
  q?: string;
}): Promise<HomeCatalogMediaItem[]> {
  const limit = opts.limit ?? 10;

  if (usesFilteredQuery(opts)) {
    return fetchFilteredMediaCatalog({ ...opts, limit });
  }

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

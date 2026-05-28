import {
  fetchHomeFeaturedMedia,
  fetchHomeNewMedia,
  fetchHomeWeeklyPopularMedia,
  prismaMediaToMediaItem,
} from "@/lib/public-media-catalog";
import type { MediaItem } from "@/lib/media-data";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import {
  buildPublicMediaOrderBy,
  buildPublicMediaWhere,
  type PublicMediaSort,
} from "@/lib/public-media-query";
import { attachMediaTrustToMediaItems } from "@/lib/media-trust-catalog";
import { mapMediaItemToHomeCatalog } from "@/lib/media-catalog-map";
import type {
  HomeCatalogMediaItem,
  MediaCatalogSort,
} from "@/lib/media-catalog-types";

export type { HomeCatalogMediaItem, MediaCatalogSort } from "@/lib/media-catalog-types";
export {
  mapMediaItemToHomeCatalog,
  catalogThumbnailImageProps,
} from "@/lib/media-catalog-map";

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

export async function fetchFilteredMediaCatalog(opts: {
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
    const enriched = await attachMediaTrustToMediaItems(
      rows.map((row) => prismaMediaToMediaItem(row)),
    );
    return enriched.map(mapMediaItemToHomeCatalog);
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

  return rows.map(mapMediaItemToHomeCatalog);
}

export async function countPublicMediaCatalog(opts: {
  category?: string;
  target?: string;
  region?: string;
  q?: string;
}): Promise<number> {
  if (!isDatabaseConfigured()) return 0;
  try {
    const db = getPrisma();
    const where = buildPublicMediaWhere({
      category: opts.category,
      target: opts.target,
      region: opts.region,
      q: opts.q,
    });
    return await db.media.count({ where });
  } catch (e) {
    console.error("[countPublicMediaCatalog]", e);
    return 0;
  }
}

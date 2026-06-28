import {
  fetchHomeFeaturedMedia,
  fetchHomeNewMedia,
  fetchHomeWeeklyPopularMedia,
} from "@/lib/public-media-catalog";
import type { MediaItem } from "@/lib/media-data";
import { isDatabaseConfigured } from "@/lib/prisma";
import {
  countMergedMediaBrowse,
  queryMergedMediaBrowse,
  type MergedBrowseQuery,
} from "@/lib/merged-media-browse";
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

type BrowseListOpts = {
  sort: MediaCatalogSort;
  limit: number;
  skip?: number;
  category?: string;
  mainCategory?: string;
  subCategory?: string;
  target?: string;
  region?: string;
  regionMain?: string;
  regionSub?: string;
  q?: string;
  features?: string;
  networkType?: string;
  priceMin?: number;
  priceMax?: number;
};

function toMergedQuery(opts: BrowseListOpts): MergedBrowseQuery {
  const page =
    opts.skip != null && opts.skip > 0
      ? Math.floor(opts.skip / opts.limit) + 1
      : 1;
  return {
    sort: opts.sort,
    limit: opts.limit,
    page,
    category: opts.category,
    mainCategory: opts.mainCategory,
    subCategory: opts.subCategory,
    target: opts.target,
    region: opts.region,
    regionMain: opts.regionMain,
    regionSub: opts.regionSub,
    q: opts.q,
    features: opts.features,
    networkType: opts.networkType,
    priceMin: opts.priceMin,
    priceMax: opts.priceMax,
  };
}

async function fetchMergedBrowseItems(opts: BrowseListOpts): Promise<MediaItem[]> {
  if (!isDatabaseConfigured()) {
    return [];
  }
  try {
    const { data } = await queryMergedMediaBrowse(toMergedQuery(opts));
    return data;
  } catch (e) {
    console.error("[fetchMergedBrowseItems] query failed", e);
    return [];
  }
}

/** `/media` SSR·클라이언트 — 일반+네트워크 병합 카탈로그 */
export async function fetchFilteredMediaCatalogItems(opts: {
  sort: MediaCatalogSort;
  limit: number;
  category?: string;
  mainCategory?: string;
  subCategory?: string;
  target?: string;
  region?: string;
  regionMain?: string;
  regionSub?: string;
  q?: string;
  features?: string;
  networkType?: string;
  priceMin?: number;
  priceMax?: number;
}): Promise<MediaItem[]> {
  return fetchMergedBrowseItems({ ...opts, skip: 0 });
}

export async function fetchFilteredMediaCatalog(opts: {
  sort: MediaCatalogSort;
  limit: number;
  category?: string;
  target?: string;
  region?: string;
  q?: string;
}): Promise<HomeCatalogMediaItem[]> {
  const items = await fetchMergedBrowseItems({ ...opts, skip: 0 });
  return items.map(mapMediaItemToHomeCatalog);
}

export async function fetchPublicMediaCatalog(opts: {
  sort: MediaCatalogSort;
  limit?: number;
  category?: string;
  target?: string;
  region?: string;
  q?: string;
  /** 다른 홈 섹션과 중복 제거 (인기/신규에 적용) */
  excludeIds?: string[];
}): Promise<HomeCatalogMediaItem[]> {
  const limit = opts.limit ?? 10;

  if (usesFilteredQuery(opts)) {
    return fetchFilteredMediaCatalog({ ...opts, limit });
  }

  const excludeIds = opts.excludeIds ?? [];
  let rows: MediaItem[] = [];

  switch (opts.sort) {
    case "recommended":
      rows = await fetchHomeFeaturedMedia(limit);
      break;
    case "popular":
      rows = await fetchHomeWeeklyPopularMedia(limit, excludeIds);
      break;
    case "newest":
      rows = await fetchHomeNewMedia(limit, excludeIds);
      break;
    default:
      rows = [];
  }

  return rows.map(mapMediaItemToHomeCatalog);
}

export async function countPublicMediaCatalog(opts: {
  category?: string;
  mainCategory?: string;
  subCategory?: string;
  target?: string;
  region?: string;
  regionMain?: string;
  regionSub?: string;
  q?: string;
  features?: string;
  networkType?: string;
  priceMin?: number;
  priceMax?: number;
}): Promise<number> {
  if (!isDatabaseConfigured()) return 0;
  try {
    return await countMergedMediaBrowse(opts);
  } catch (e) {
    console.error("[countPublicMediaCatalog]", e);
    return 0;
  }
}

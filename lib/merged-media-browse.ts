import type { MediaItem } from "@/lib/media-data";
import {
  filterMediaByDiscoveryChips,
  discoveryFeaturesIncludeNetwork,
} from "@/lib/media-discovery-client-filter";
import { mediaItemMatchesNetworkTypeChip } from "@/lib/media-network-types";
import { compareMediaPopularRank } from "@/lib/media-popularity";
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";
import type {
  PublicMediaQueryParams,
  PublicMediaSort,
} from "@/lib/public-media-query";

export type MergedBrowseQuery = Pick<
  PublicMediaQueryParams,
  | "q"
  | "category"
  | "mainCategory"
  | "subCategory"
  | "target"
  | "region"
  | "regionMain"
  | "regionSub"
  | "minPrice"
  | "maxPrice"
  | "priceMin"
  | "priceMax"
  | "features"
  | "networkType"
  | "available"
  | "operatingHours"
  | "sort"
  | "page"
  | "limit"
>;

export function publicMediaParamsToChipFilter(
  params: MergedBrowseQuery,
): Parameters<typeof filterMediaByDiscoveryChips>[1] {
  const minPrice = params.minPrice ?? params.priceMin;
  const maxPrice = params.maxPrice ?? params.priceMax;
  return {
    category: params.category?.trim() || undefined,
    mainCategory: params.mainCategory?.trim() || undefined,
    subCategory: params.subCategory?.trim() || undefined,
    target: params.target?.trim() || undefined,
    region: params.region?.trim() || undefined,
    regionMain: params.regionMain?.trim() || undefined,
    regionSub: params.regionSub?.trim() || undefined,
    priceMin:
      minPrice != null && Number.isFinite(minPrice) ? String(minPrice) : undefined,
    priceMax:
      maxPrice != null && Number.isFinite(maxPrice) ? String(maxPrice) : undefined,
    features: params.features?.trim() || undefined,
    query: params.q?.trim() || undefined,
  };
}

/** 인메모리 추가 필터 — chip 필터에 없는 DB 전용 조건 */
export function applyMergedBrowseExtraFilters(
  items: MediaItem[],
  params: MergedBrowseQuery,
): MediaItem[] {
  let out = items;
  if (params.available === true) {
    out = out.filter((m) => m.availability === "available");
  }
  const hours = params.operatingHours?.trim();
  if (hours) {
    const needle = hours.toLowerCase();
    out = out.filter((m) =>
      m.operatingHours?.toLowerCase().includes(needle),
    );
  }
  const networkType = params.networkType?.trim();
  if (networkType && discoveryFeaturesIncludeNetwork(params.features)) {
    out = out.filter((m) => mediaItemMatchesNetworkTypeChip(m, networkType));
  }
  return out;
}

/** Discovery browse·지도 인기순 — 홈 주간 인기와 동일한 popularity 폴백 우선 */
export function sortMergedBrowseCatalog(
  items: MediaItem[],
  sort: PublicMediaSort | null | undefined,
): MediaItem[] {
  const arr = [...items];
  switch (sort) {
    case "newest":
      return arr.sort((a, b) => {
        const at = a.createdAt ? Date.parse(a.createdAt) : 0;
        const bt = b.createdAt ? Date.parse(b.createdAt) : 0;
        return bt - at;
      });
    case "price_asc":
      return arr.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    case "price_desc":
      return arr.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    case "rating":
      return arr.sort(
        (a, b) =>
          (b.popularityScore ?? 0) - (a.popularityScore ?? 0) ||
          (b.dailyFootTraffic ?? 0) - (a.dailyFootTraffic ?? 0),
      );
    case "recommended":
      return arr.sort(
        (a, b) =>
          (b.popularityScore ?? 0) - (a.popularityScore ?? 0) ||
          (b.dailyFootTraffic ?? 0) - (a.dailyFootTraffic ?? 0),
      );
    case "popular":
    case "default":
    default:
      return arr.sort(compareMediaPopularRank);
  }
}

export async function loadMergedBrowseCatalog(): Promise<MediaItem[]> {
  return fetchPublicMediaCatalog();
}

export function filterMergedBrowseCatalog(
  catalog: MediaItem[],
  params: MergedBrowseQuery,
): MediaItem[] {
  const chipFiltered = filterMediaByDiscoveryChips(
    catalog,
    publicMediaParamsToChipFilter(params),
  );
  return applyMergedBrowseExtraFilters(chipFiltered, params);
}

export async function queryMergedMediaBrowse(params: MergedBrowseQuery): Promise<{
  data: MediaItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 24));
  const catalog = await loadMergedBrowseCatalog();
  const filtered = sortMergedBrowseCatalog(
    filterMergedBrowseCatalog(catalog, params),
    params.sort,
  );
  const total = filtered.length;
  const skip = (page - 1) * limit;
  const data = filtered.slice(skip, skip + limit);
  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 0,
  };
}

export async function countMergedMediaBrowse(
  params: Omit<MergedBrowseQuery, "page" | "limit" | "sort">,
): Promise<number> {
  const catalog = await loadMergedBrowseCatalog();
  return filterMergedBrowseCatalog(catalog, params).length;
}

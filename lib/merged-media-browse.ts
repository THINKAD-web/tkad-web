import type { MediaItem } from "@/lib/media-data";
import {
  filterMediaByDiscoveryChips,
  discoveryFeaturesIncludeNetwork,
} from "@/lib/media-discovery-client-filter";
import { mediaItemMatchesNetworkTypeChip } from "@/lib/media-network-types";
import { compareMediaPopularRank } from "@/lib/media-popularity";
import { getCachedDailyEngagementScoreRecord } from "@/lib/media-popularity-daily-cache";
import { compareMediaByMonthlyEquivalentPrice } from "@/lib/media-metrics";
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

/** Discovery browse·지도 인기순 — 최근 24h 참여 점수(10분 캐시), tie-break은 주간 폴백 */
export async function sortMergedBrowseCatalogAsync(
  items: MediaItem[],
  sort: PublicMediaSort | null | undefined,
): Promise<MediaItem[]> {
  if (sort !== "popular" && sort !== "default" && sort != null) {
    return sortMergedBrowseCatalog(items, sort);
  }
  const dailyScores = await getCachedDailyEngagementScoreRecord();
  return [...items].sort((a, b) => {
    const scoreDelta =
      (dailyScores[b.id] ?? 0) - (dailyScores[a.id] ?? 0);
    if (scoreDelta !== 0) return scoreDelta;
    return compareMediaPopularRank(a, b);
  });
}

/** 비인기 sort·테스트용 동기 정렬 */
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
      return arr.sort((a, b) =>
        compareMediaByMonthlyEquivalentPrice(a, b, "asc"),
      );
    case "price_desc":
      return arr.sort((a, b) =>
        compareMediaByMonthlyEquivalentPrice(a, b, "desc"),
      );
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
  const filtered = filterMergedBrowseCatalog(catalog, params);
  const sorted = await sortMergedBrowseCatalogAsync(filtered, params.sort);
  const total = filtered.length;
  const skip = (page - 1) * limit;
  const data = sorted.slice(skip, skip + limit);
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

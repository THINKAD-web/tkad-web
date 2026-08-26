import type { Prisma } from "@prisma/client";
import type { MediaItem } from "@/lib/media-data";
import {
  prismaMediaToMediaItem,
  PUBLIC_MEDIA_CATALOG_INCLUDE,
  type MediaWithAdvertiserExecutions,
} from "@/lib/public-media-catalog";
import {
  attachPublicMediaCatalogExtras,
  PUBLIC_BROWSE_CATALOG_EXTRAS,
} from "@/lib/attach-public-media-catalog-extras";
import { attachReviewStatsToMediaItems } from "@/lib/media-reviews";
import { attachMediaTrustToMediaItems } from "@/lib/media-trust-catalog";
import {
  fetchPublicMediaNetworks,
  parseNetworkRawId,
} from "@/lib/media-network-public";
import { buildPublicNetworkWhere } from "@/lib/public-network-query";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { publicActiveMediaWhere } from "@/lib/media-review-status";
import {
  buildPublicMediaOrderBy,
  buildPublicMediaWhere,
  publicMediaSortNeedsAppLevelPriceNormalize,
  type PublicMediaSort,
} from "@/lib/public-media-query";
import type { MergedBrowseQuery } from "@/lib/merged-media-browse";
import {
  applyMergedBrowseExtraFilters,
  filterMergedBrowseCatalog,
  sortMergedBrowseCatalog,
} from "@/lib/merged-media-browse";

/** Browse list/sort·chip refine — relations·이미지 제외 scalar */
export const MEDIA_BROWSE_CANDIDATE_SELECT = {
  id: true,
  slug: true,
  name: true,
  nameEn: true,
  locationEn: true,
  location: true,
  country: true,
  region: true,
  regionZone: true,
  type: true,
  price: true,
  pricePeriod: true,
  pricingMode: true,
  priceOptions: true,
  partialPeriodRates: true,
  subCategory: true,
  mediaCategory: true,
  mediaMainCategory: true,
  mediaSubCategory: true,
  regionMain: true,
  regionSub: true,
  targetCategory: true,
  tags: true,
  district: true,
  city: true,
  latitude: true,
  longitude: true,
  dailyFootfall: true,
  impressions: true,
  reach: true,
  frequency: true,
  cpm: true,
  engagementRate: true,
  visibilityScore: true,
  targetAge: true,
  effectMemo: true,
  description: true,
  descriptionEn: true,
  nearbyStations: true,
  nearbyLandmarks: true,
  nearbyFacilities: true,
  pastAdvertisers: true,
  operatingHours: true,
  availability: true,
  instantBookingEnabled: true,
  isVerified: true,
  proposalUrl: true,
  proposalFileName: true,
  hasProposal: true,
  popularityScore: true,
  viewCount: true,
  featuredOrder: true,
  widthM: true,
  heightM: true,
  width: true,
  height: true,
  resolution: true,
  installYear: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.MediaSelect;

export type MediaBrowseCandidateRow = Prisma.MediaGetPayload<{
  select: typeof MEDIA_BROWSE_CANDIDATE_SELECT;
}>;

/** `publicActiveMediaWhere` + chip filters (`buildPublicMediaWhere` 와 동치). */
export function buildMediaBrowseDbWhere(
  params: MergedBrowseQuery,
): Prisma.MediaWhereInput {
  return buildPublicMediaWhere(params);
}

/** DB where 만으로 chip semantics 와 충분히 일치하는 요청 */
export function mediaBrowseUsesDbPaginationOnly(
  params: MergedBrowseQuery,
): boolean {
  if (publicMediaSortNeedsAppLevelPriceNormalize(params.sort)) return false;
  if (params.networkType?.trim()) return false;
  if (params.q?.trim()) return false;
  if (
    params.category?.trim() &&
    !params.mainCategory?.trim() &&
    !params.subCategory?.trim()
  ) {
    return false;
  }
  if (
    params.region?.trim() &&
    !params.regionMain?.trim() &&
    !params.regionSub?.trim()
  ) {
    return false;
  }
  return true;
}

export function sortBrowseCandidates(
  items: MediaItem[],
  sort: PublicMediaSort | null | undefined,
): MediaItem[] {
  return sortMergedBrowseCatalog(items, sort);
}

async function loadMediaBrowseCandidates(
  params: MergedBrowseQuery,
): Promise<MediaItem[]> {
  const db = getPrisma();
  const where = buildMediaBrowseDbWhere(params);
  const rows = await db.media.findMany({
    where,
    select: MEDIA_BROWSE_CANDIDATE_SELECT,
  });
  const withCoverage = await attachPublicMediaCatalogExtras(
    db,
    rows,
    PUBLIC_BROWSE_CATALOG_EXTRAS,
  );
  return withCoverage.map((row) =>
    prismaMediaToMediaItem(row as MediaWithAdvertiserExecutions),
  );
}

async function loadNetworkBrowseCandidates(
  params: MergedBrowseQuery,
): Promise<MediaItem[]> {
  if (!isDatabaseConfigured()) return [];
  const q = params.q?.trim();
  if (q) {
    const db = getPrisma();
    const netWhere = buildPublicNetworkWhere({
      q,
      regionMain: params.regionMain ?? undefined,
      regionSub: params.regionSub ?? undefined,
      networkType: params.networkType ?? undefined,
    });
    const rows = await db.mediaNetwork.findMany({
      where: netWhere,
      include: { locations: true },
    });
    const { prismaNetworkToMediaItem } = await import("@/lib/media-network-public");
    return rows.map(prismaNetworkToMediaItem);
  }
  return fetchPublicMediaNetworks();
}

async function hydrateMediaBrowsePageItems(
  pageItems: MediaItem[],
): Promise<MediaItem[]> {
  if (pageItems.length === 0) return [];

  const mediaIds = pageItems
    .filter((m) => m.catalogSource !== "network")
    .map((m) => m.id);
  const networkIds = pageItems
    .map((m) => parseNetworkRawId(m.id))
    .filter((id): id is string => Boolean(id));

  const db = getPrisma();
  const [mediaRows, networkRows] = await Promise.all([
    mediaIds.length
      ? db.media.findMany({
          where: publicActiveMediaWhere({ id: { in: mediaIds } }),
          include: PUBLIC_MEDIA_CATALOG_INCLUDE,
        })
      : Promise.resolve([]),
    networkIds.length
      ? db.mediaNetwork.findMany({
          where: { id: { in: networkIds }, isActive: true },
          include: { locations: true },
        })
      : Promise.resolve([]),
  ]);

  const mediaWithCoverage = mediaIds.length
    ? await attachPublicMediaCatalogExtras(
        db,
        mediaRows,
        PUBLIC_BROWSE_CATALOG_EXTRAS,
      )
    : [];

  const { prismaNetworkToMediaItem } = await import("@/lib/media-network-public");
  const mediaById = new Map(
    mediaWithCoverage.map((row) => [
      row.id,
      prismaMediaToMediaItem(row as MediaWithAdvertiserExecutions),
    ]),
  );
  const networkById = new Map<string, MediaItem>();
  for (const row of networkRows) {
    const item = prismaNetworkToMediaItem(row);
    networkById.set(item.id, item);
  }

  const ordered = pageItems.map(
    (item) =>
      mediaById.get(item.id) ??
      networkById.get(item.id) ??
      item,
  );

  const withReviews = await attachReviewStatsToMediaItems(ordered);
  return attachMediaTrustToMediaItems(withReviews);
}

async function queryMergedBrowseWithDbSkipTake(
  params: MergedBrowseQuery,
  page: number,
  limit: number,
): Promise<{
  data: MediaItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const db = getPrisma();
  const where = buildMediaBrowseDbWhere(params);
  const orderBy = buildPublicMediaOrderBy(params.sort);
  const skip = (page - 1) * limit;

  const [total, rows] = await Promise.all([
    db.media.count({ where }),
    db.media.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: MEDIA_BROWSE_CANDIDATE_SELECT,
    }),
  ]);

  const withCoverage = await attachPublicMediaCatalogExtras(
    db,
    rows,
    PUBLIC_BROWSE_CATALOG_EXTRAS,
  );
  const stubs = withCoverage.map((row) =>
    prismaMediaToMediaItem(row as MediaWithAdvertiserExecutions),
  );
  const refined = applyMergedBrowseExtraFilters(stubs, params);
  const data = await hydrateMediaBrowsePageItems(refined);

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 0,
  };
}

/** DB chip filter + take/skip(가능 시) 또는 lightweight merge pagination */
export async function queryMediaBrowseFromDb(
  params: MergedBrowseQuery,
): Promise<{
  data: MediaItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 24));

  const [mediaCandidates, networkCandidates] = await Promise.all([
    loadMediaBrowseCandidates(params),
    loadNetworkBrowseCandidates(params),
  ]);
  const filteredNetworks = filterMergedBrowseCatalog(networkCandidates, params);

  if (
    mediaBrowseUsesDbPaginationOnly(params) &&
    filteredNetworks.length === 0
  ) {
    return queryMergedBrowseWithDbSkipTake(params, page, limit);
  }

  const filtered = filterMergedBrowseCatalog(
    [...mediaCandidates, ...filteredNetworks],
    params,
  );
  const sorted = sortBrowseCandidates(filtered, params.sort);
  const total = sorted.length;
  const skip = (page - 1) * limit;
  const pageSlice = sorted.slice(skip, skip + limit);
  const data = await hydrateMediaBrowsePageItems(pageSlice);

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 0,
  };
}

export async function countMediaBrowseFromDb(
  params: Omit<MergedBrowseQuery, "page" | "limit" | "sort">,
): Promise<number> {
  const [mediaCandidates, networkCandidates] = await Promise.all([
    loadMediaBrowseCandidates(params),
    loadNetworkBrowseCandidates(params),
  ]);
  return filterMergedBrowseCatalog(
    [...mediaCandidates, ...networkCandidates],
    params,
  ).length;
}

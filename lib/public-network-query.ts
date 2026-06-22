import type { Prisma } from "@prisma/client";
import type { MediaCatalogSort } from "@/lib/media-catalog-types";
import { networkDbTypesForCatalogFilter } from "@/lib/media-network-types";
import {
  browseRegionMainIdToLabel,
  normalizeBrowseRegionMainId,
  normalizeBrowseRegionSubId,
} from "@/lib/network-location-enrich";

export type PublicNetworkQuery = {
  networkType?: string;
  regionMain?: string;
  regionSub?: string;
  q?: string;
  sort?: MediaCatalogSort;
  page?: number;
  limit?: number;
};

export function parsePublicNetworkQuery(
  params: URLSearchParams,
): PublicNetworkQuery {
  const page = Math.max(1, Math.round(Number(params.get("page")) || 1));
  const limit = Math.min(
    60,
    Math.max(1, Math.round(Number(params.get("limit")) || 24)),
  );
  const sort = (params.get("sort") ?? "popular") as MediaCatalogSort;
  return {
    networkType: params.get("networkType")?.trim() || undefined,
    regionMain: params.get("regionMain")?.trim() || undefined,
    regionSub: params.get("regionSub")?.trim() || undefined,
    q: params.get("q")?.trim() || undefined,
    sort,
    page,
    limit,
  };
}

export function buildPublicNetworkWhere(
  params: Pick<PublicNetworkQuery, "networkType" | "regionMain" | "regionSub" | "q">,
): Prisma.MediaNetworkWhereInput {
  const and: Prisma.MediaNetworkWhereInput[] = [{ isActive: true }];

  if (params.networkType) {
    const types = networkDbTypesForCatalogFilter(params.networkType);
    and.push(types.length > 1 ? { type: { in: types } } : { type: types[0] });
  }

  if (params.regionMain) {
    const raw = params.regionMain.trim();
    const mainId = normalizeBrowseRegionMainId(raw) ?? raw;
    const mainLabel = browseRegionMainIdToLabel(mainId) ?? raw;
    and.push({
      OR: [
        { regions: { has: mainLabel } },
        { regions: { has: mainId } },
        { regions: { has: raw } },
        { city: { contains: raw, mode: "insensitive" } },
        {
          locations: {
            some: {
              OR: [
                { regionMain: { equals: mainId, mode: "insensitive" } },
                { regionMain: { equals: mainLabel, mode: "insensitive" } },
                { regionMain: { equals: raw, mode: "insensitive" } },
              ],
            },
          },
        },
      ],
    });
  }

  if (params.regionSub) {
    const raw = params.regionSub.trim();
    const mainHint = params.regionMain
      ? normalizeBrowseRegionMainId(params.regionMain) ??
        params.regionMain.trim()
      : null;
    const subId = normalizeBrowseRegionSubId(raw, mainHint) ?? raw;
    and.push({
      OR: [
        { district: { contains: raw, mode: "insensitive" } },
        {
          locations: {
            some: {
              OR: [
                { regionSub: { contains: subId, mode: "insensitive" } },
                { regionSub: { contains: raw, mode: "insensitive" } },
              ],
            },
          },
        },
      ],
    });
  }

  if (params.q) {
    const q = params.q;
    and.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { nameEn: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { features: { contains: q, mode: "insensitive" } },
        { tags: { has: q } },
        {
          locations: {
            some: {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { address: { contains: q, mode: "insensitive" } },
                { fullAddress: { contains: q, mode: "insensitive" } },
              ],
            },
          },
        },
      ],
    });
  }

  return { AND: and };
}

export function buildPublicNetworkOrderBy(
  sort: MediaCatalogSort = "popular",
): Prisma.MediaNetworkOrderByWithRelationInput[] {
  switch (sort) {
    case "price_asc":
      return [{ pricePerUnit: "asc" }, { updatedAt: "desc" }];
    case "price_desc":
      return [{ pricePerUnit: "desc" }, { updatedAt: "desc" }];
    case "newest":
      return [{ createdAt: "desc" }];
    case "recommended":
    case "popular":
    default:
      return [{ totalLocations: "desc" }, { updatedAt: "desc" }];
  }
}

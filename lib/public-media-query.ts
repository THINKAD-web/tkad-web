import type { Prisma } from "@prisma/client";
import { expandMediaRegionChip } from "@/lib/media-discovery-filter-chips";

export type PublicMediaSort =
  | "popular"
  | "recommended"
  | "newest"
  | "price_asc"
  | "price_desc"
  | "rating"
  | "default";

export type PublicMediaQueryParams = {
  q?: string | null;
  category?: string | null;
  target?: string | null;
  region?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  available?: boolean | null;
  sort?: PublicMediaSort | null;
  page?: number;
  limit?: number;
};

export function buildPublicMediaWhere(
  params: PublicMediaQueryParams,
): Prisma.MediaWhereInput {
  const and: Prisma.MediaWhereInput[] = [{ isActive: true }];

  if (params.category?.trim()) {
    and.push({ mediaCategory: { has: params.category.trim() } });
  }
  if (params.target?.trim()) {
    and.push({ targetCategory: { has: params.target.trim() } });
  }
  if (params.region?.trim()) {
    const aliases = expandMediaRegionChip(params.region);
    and.push({
      OR: aliases.flatMap((alias) => [
        { region: { contains: alias, mode: "insensitive" } },
        { city: { contains: alias, mode: "insensitive" } },
        { district: { contains: alias, mode: "insensitive" } },
        { regionZone: { contains: alias, mode: "insensitive" } },
        { location: { contains: alias, mode: "insensitive" } },
        { name: { contains: alias, mode: "insensitive" } },
        { nearbyStations: { contains: alias, mode: "insensitive" } },
        { nearbyLandmarks: { contains: alias, mode: "insensitive" } },
      ]),
    });
  }
  if (params.q?.trim()) {
    const q = params.q.trim();
    and.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { region: { contains: q, mode: "insensitive" } },
        { city: { contains: q, mode: "insensitive" } },
        { district: { contains: q, mode: "insensitive" } },
        { type: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  const priceFilter: { gte?: number; lte?: number } = {};
  if (params.minPrice != null && Number.isFinite(params.minPrice)) {
    priceFilter.gte = params.minPrice;
  }
  if (params.maxPrice != null && Number.isFinite(params.maxPrice)) {
    priceFilter.lte = params.maxPrice;
  }
  if (Object.keys(priceFilter).length > 0) {
    and.push({ price: priceFilter });
  }
  if (params.available === true) {
    and.push({ availability: "available" });
  }

  return and.length === 1 ? and[0]! : { AND: and };
}

export function buildPublicMediaOrderBy(
  sort: PublicMediaSort | null | undefined,
): Prisma.MediaOrderByWithRelationInput[] {
  switch (sort) {
    case "recommended":
      return [{ featuredOrder: "asc" }, { popularityScore: "desc" }];
    case "newest":
      return [{ createdAt: "desc" }];
    case "price_asc":
      return [{ price: "asc" }];
    case "price_desc":
      return [{ price: "desc" }];
    case "rating":
      return [{ popularityScore: "desc" }, { updatedAt: "desc" }];
    case "popular":
    case "default":
    default:
      return [{ popularityScore: "desc" }, { updatedAt: "desc" }];
  }
}

export function parsePublicMediaQuery(
  sp: URLSearchParams,
): PublicMediaQueryParams {
  const parseNum = (v: string | null) => {
    if (!v) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const sortRaw = sp.get("sort");
  const sort =
    sortRaw === "newest" ||
    sortRaw === "recommended" ||
    sortRaw === "price_asc" ||
    sortRaw === "price_desc" ||
    sortRaw === "rating" ||
    sortRaw === "popular" ||
    sortRaw === "default"
      ? sortRaw
      : null;

  return {
    q: sp.get("q"),
    category: sp.get("category") ?? sp.get("cat"),
    target: sp.get("target"),
    region: sp.get("region"),
    minPrice: parseNum(sp.get("minPrice")),
    maxPrice: parseNum(sp.get("maxPrice")),
    available:
      sp.get("available") === "true"
        ? true
        : sp.get("available") === "false"
          ? false
          : null,
    sort,
    page: Math.max(1, parseNum(sp.get("page")) ?? 1),
    limit: Math.min(100, Math.max(1, parseNum(sp.get("limit")) ?? 24)),
  };
}

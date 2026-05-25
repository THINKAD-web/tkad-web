import type { Prisma } from "@prisma/client";

export type PublicMediaSort =
  | "popular"
  | "recommended"
  | "newest"
  | "price_asc"
  | "price_desc"
  | "rating"
  | "default";

export type PublicMediaQueryParams = {
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
  const where: Prisma.MediaWhereInput = { isActive: true };

  if (params.category?.trim()) {
    where.mediaCategory = { has: params.category.trim() };
  }
  if (params.target?.trim()) {
    where.targetCategory = { has: params.target.trim() };
  }
  if (params.region?.trim()) {
    const region = params.region.trim();
    where.OR = [
      { region: { contains: region, mode: "insensitive" } },
      { city: { contains: region, mode: "insensitive" } },
      { district: { contains: region, mode: "insensitive" } },
      { regionZone: { contains: region, mode: "insensitive" } },
    ];
  }
  const priceFilter: { gte?: number; lte?: number } = {};
  if (params.minPrice != null && Number.isFinite(params.minPrice)) {
    priceFilter.gte = params.minPrice;
  }
  if (params.maxPrice != null && Number.isFinite(params.maxPrice)) {
    priceFilter.lte = params.maxPrice;
  }
  if (Object.keys(priceFilter).length > 0) {
    where.price = priceFilter;
  }
  if (params.available === true) {
    where.availability = "available";
  }

  return where;
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

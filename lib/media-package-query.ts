import type { Prisma } from "@prisma/client";
import type { PublicMediaPackage } from "@/lib/media-package-types";
import {
  buildPublicMediaOrderBy,
  type PublicMediaSort,
} from "@/lib/public-media-query";

export type MediaPackageFilterInput = Pick<
  PublicMediaPackage,
  | "filterRegion"
  | "filterCategory"
  | "filterTarget"
  | "filterMaxPrice"
  | "filterMinPrice"
  | "sortBy"
>;

function regionOrClauses(regions: string[]): Prisma.MediaWhereInput[] {
  return regions.flatMap((region) => {
    const r = region.trim();
    if (!r) return [];
    return [
      { region: { contains: r, mode: "insensitive" as const } },
      { city: { contains: r, mode: "insensitive" as const } },
      { district: { contains: r, mode: "insensitive" as const } },
      { location: { contains: r, mode: "insensitive" as const } },
      { regionZone: { contains: r, mode: "insensitive" as const } },
    ];
  });
}

export function buildMediaPackageWhere(
  filters: MediaPackageFilterInput,
  opts?: { relax?: boolean },
): Prisma.MediaWhereInput {
  const and: Prisma.MediaWhereInput[] = [{ isActive: true }];
  const relax = opts?.relax === true;

  const regions = filters.filterRegion.filter(Boolean);
  if (regions.length > 0) {
    const regionClauses = regionOrClauses(regions);
    if (regionClauses.length > 0) {
      and.push({ OR: regionClauses });
    }
  }

  const categories = filters.filterCategory.filter(Boolean);
  if (categories.length > 0) {
    and.push({
      OR: [
        { mediaCategory: { hasSome: categories } },
        { type: { in: categories, mode: "insensitive" } },
        ...categories.map(
          (c): Prisma.MediaWhereInput => ({
            tags: { has: c },
          }),
        ),
      ],
    });
  }

  if (!relax) {
    const targets = filters.filterTarget.filter(Boolean);
    if (targets.length > 0) {
      and.push({ targetCategory: { hasSome: targets } });
    }
  }

  const priceFilter: { gte?: number; lte?: number } = {};
  if (filters.filterMinPrice != null && Number.isFinite(filters.filterMinPrice)) {
    priceFilter.gte = filters.filterMinPrice;
  }
  if (filters.filterMaxPrice != null && Number.isFinite(filters.filterMaxPrice)) {
    priceFilter.lte = filters.filterMaxPrice;
  }
  if (Object.keys(priceFilter).length > 0) {
    and.push({ price: priceFilter });
  }

  return and.length === 1 ? and[0]! : { AND: and };
}

export function mediaPackageSortToOrderBy(
  sortBy: string,
): Prisma.MediaOrderByWithRelationInput[] {
  const sort: PublicMediaSort =
    sortBy === "newest" ||
    sortBy === "price_asc" ||
    sortBy === "price_desc" ||
    sortBy === "rating" ||
    sortBy === "popular"
      ? sortBy
      : "popular";
  return buildPublicMediaOrderBy(sort);
}

/** 엄격 필터 결과가 없을 때 카테고리·지역 조건을 완화 */
export function buildRelaxedMediaPackageWhere(
  filters: MediaPackageFilterInput,
): Prisma.MediaWhereInput {
  const relaxed: MediaPackageFilterInput = {
    ...filters,
    filterTarget: [],
    filterMaxPrice: null,
    filterMinPrice: null,
  };
  return buildMediaPackageWhere(relaxed, { relax: true });
}

export function buildPopularFallbackWhere(): Prisma.MediaWhereInput {
  return { isActive: true };
}

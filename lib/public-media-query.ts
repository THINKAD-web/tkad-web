import type { Prisma } from "@prisma/client";
import {
  resolveBrowseCatalogChannelFilter,
  mediaItemMatchesBrowseCatalogChannel,
  type BrowseChannelRoute,
} from "@/lib/browse-catalog-channel";
import { normalizeCatalogChannel } from "@/lib/catalog-channel";
import { publicNotFlaggedMediaWhere } from "@/lib/media-review-status";
import { resolveBrowseCategoryParams } from "@/lib/media-browse-categories";
import { expandBrowseRegionSub } from "@/lib/media-browse-regions";
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
  mainCategory?: string | null;
  subCategory?: string | null;
  target?: string | null;
  region?: string | null;
  regionMain?: string | null;
  regionSub?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  priceMin?: number | null;
  priceMax?: number | null;
  features?: string | null;
  networkType?: string | null;
  available?: boolean | null;
  operatingHours?: string | null;
  sort?: PublicMediaSort | null;
  page?: number;
  limit?: number;
  /** PR4 — route channel or legacy cross-channel exception (see resolveBrowseCatalogChannelFilter). */
  browseChannel?: BrowseChannelRoute | null;
  catalogChannel?: string | null;
};

function parseFeatures(featuresRaw: string | null | undefined): string[] {
  if (!featuresRaw?.trim()) return [];
  return featuresRaw
    .split(/[,，]/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function buildPublicMediaWhere(
  params: PublicMediaQueryParams,
): Prisma.MediaWhereInput {
  const and: Prisma.MediaWhereInput[] = [
    { isActive: true },
    publicNotFlaggedMediaWhere(),
  ];

  const resolved = resolveBrowseCategoryParams({
    mainCategory: params.mainCategory,
    subCategory: params.subCategory,
    category: params.category,
  });

  if (resolved.mainCategory) {
    and.push({ mediaMainCategory: resolved.mainCategory });
  }
  if (resolved.subCategory) {
    and.push({ mediaSubCategory: resolved.subCategory });
  }

  const channelFilter = resolveBrowseCatalogChannelFilter({
    browseChannel: params.browseChannel ?? "offline",
    mainCategory: params.mainCategory,
    subCategory: params.subCategory,
    category: params.category,
    catalogChannel: params.catalogChannel,
  });
  if (channelFilter) {
    and.push({ catalogChannel: channelFilter });
  }

  if (
    params.category?.trim() &&
    !resolved.mainCategory &&
    !resolved.subCategory
  ) {
    and.push({ mediaCategory: { has: params.category.trim() } });
  }

  if (params.target?.trim()) {
    and.push({ targetCategory: { has: params.target.trim() } });
  }

  if (params.regionMain?.trim()) {
    and.push({ regionMain: params.regionMain.trim() });
  }
  if (params.regionSub?.trim()) {
    and.push({ regionSub: params.regionSub.trim() });
  }

  if (params.region?.trim() && !params.regionMain && !params.regionSub) {
    const aliases = expandMediaRegionChip(params.region);
    and.push({
      OR: aliases.flatMap((alias) => [
        { region: { contains: alias, mode: "insensitive" } },
        { city: { contains: alias, mode: "insensitive" } },
        { district: { contains: alias, mode: "insensitive" } },
        { regionZone: { contains: alias, mode: "insensitive" } },
        { regionMain: { contains: alias, mode: "insensitive" } },
        { regionSub: { contains: alias, mode: "insensitive" } },
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

  const minPrice = params.minPrice ?? params.priceMin;
  const maxPrice = params.maxPrice ?? params.priceMax;
  const priceFilter: { gte?: number; lte?: number } = {};
  if (minPrice != null && Number.isFinite(minPrice)) {
    priceFilter.gte = minPrice;
  }
  if (maxPrice != null && Number.isFinite(maxPrice)) {
    priceFilter.lte = maxPrice;
  }
  if (Object.keys(priceFilter).length > 0) {
    and.push({ price: priceFilter });
  }

  if (params.available === true) {
    and.push({ availability: "available" });
  }

  const features = parseFeatures(params.features);
  for (const f of features) {
    if (f === "instant_booking" || f === "instant") {
      and.push({ instantBookingEnabled: true });
    } else if (f === "network") {
      and.push({
        OR: [
          { mediaMainCategory: "network" },
          { type: { contains: "network", mode: "insensitive" } },
        ],
      });
    } else if (f === "24h" || f === "24hours") {
      and.push({
        operatingHours: { contains: "24", mode: "insensitive" },
      });
    }
  }

  if (params.operatingHours?.trim()) {
    and.push({
      operatingHours: {
        contains: params.operatingHours.trim(),
        mode: "insensitive",
      },
    });
  }

  return and.length === 1 ? and[0]! : { AND: and };
}

/**
 * Prisma `orderBy` 헬퍼.
 *
 * 저가/고가(`price_*`)는 DB raw `price` 정렬이다. `pricePeriod`(일/주/2주/월)를
 * 월 환산할 수 없어 **공개 /media 목록은 쓰지 않는다** — `queryMergedMediaBrowse`
 * 가 전체 카탈로그(~500)를 메모리에서 `compareMediaByMonthlyEquivalentPrice` 로
 * 정렬한 뒤 페이지 슬라이스한다 (옵션 b). Prisma 전용 경로(패키지 미리보기 등)는
 * 호출측에서 동일 비교자로 재정렬하거나 over-fetch 해야 한다.
 */
export function buildPublicMediaOrderBy(
  sort: PublicMediaSort | null | undefined,
): Prisma.MediaOrderByWithRelationInput[] {
  switch (sort) {
    case "recommended":
      return [{ featuredOrder: "asc" }, { popularityScore: "desc" }];
    case "newest":
      return [{ createdAt: "desc" }];
    case "price_asc":
      // NOT period-normalized — see JSDoc. Prefer app-level monthly sort.
      return [{ price: "asc" }, { id: "asc" }];
    case "price_desc":
      return [{ price: "desc" }, { id: "asc" }];
    case "rating":
      return [{ popularityScore: "desc" }, { viewCount: "desc" }, { updatedAt: "desc" }];
    case "popular":
    case "default":
    default:
      // popularityScore(크론) 우선, 미축적 시 누적 조회수·가시성으로 차등
      return [
        { popularityScore: "desc" },
        { viewCount: "desc" },
        { visibilityScore: "desc" },
        { updatedAt: "desc" },
      ];
  }
}

/** Prisma orderBy 로는 월 환산 정렬이 불가해 앱 레벨 정렬이 필요한 sort */
export function publicMediaSortNeedsAppLevelPriceNormalize(
  sort: PublicMediaSort | null | undefined,
): boolean {
  return sort === "price_asc" || sort === "price_desc";
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
    mainCategory: sp.get("mainCategory"),
    subCategory: sp.get("subCategory"),
    target: sp.get("target"),
    region: sp.get("region"),
    regionMain: sp.get("regionMain"),
    regionSub: sp.get("regionSub"),
    minPrice: parseNum(sp.get("minPrice")),
    maxPrice: parseNum(sp.get("maxPrice")),
    priceMin: parseNum(sp.get("priceMin")),
    priceMax: parseNum(sp.get("priceMax")),
    features: sp.get("features"),
    networkType: sp.get("networkType"),
    operatingHours: sp.get("operatingHours"),
    available:
      sp.get("available") === "true"
        ? true
        : sp.get("available") === "false"
          ? false
          : null,
    sort,
    page: Math.max(1, parseNum(sp.get("page")) ?? 1),
    limit: Math.min(100, Math.max(1, parseNum(sp.get("limit")) ?? 24)),
    browseChannel:
      sp.get("browseChannel") === "online"
        ? "online"
        : sp.get("browseChannel") === "offline"
          ? "offline"
          : null,
    catalogChannel: sp.get("catalogChannel"),
  };
}

/** Client/API helper — derive query params from browse route channel. */
export function buildBrowseChannelQueryParams(input: {
  browseChannel: BrowseChannelRoute;
}): Pick<PublicMediaQueryParams, "browseChannel" | "catalogChannel"> {
  return {
    browseChannel: input.browseChannel,
    catalogChannel:
      input.browseChannel === "online"
        ? normalizeCatalogChannel("online")
        : undefined,
  };
}

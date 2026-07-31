import type { MediaItem } from "@/lib/media-data";
import { compareMediaPopularRank } from "@/lib/media-popularity";
import type { PublicMediaSort } from "@/lib/public-media-query";
import { matchesBrowseRegion } from "@/lib/media-discovery-client-filter";
import { compareMediaByMonthlyEquivalentPrice } from "@/lib/media-metrics";
import { resolveMediaDisplayPrice } from "@/lib/media-price-format";

export type MapCatalogFilterParams = {
  category?: string | null;
  target?: string | null;
  region?: string | null;
  q?: string | null;
  sort?: PublicMediaSort | null;
  minPrice?: number | null;
  maxPrice?: number | null;
};

/** `/media` `buildPublicMediaWhere` 와 동일한 의미 — 인메모리 카탈로그용 */
export function matchesMapCatalogFilter(
  m: MediaItem,
  params: MapCatalogFilterParams,
): boolean {
  const category = params.category?.trim();
  if (category) {
    const inCategory = m.mediaCategory?.includes(category) ?? false;
    const inType = m.type === category;
    if (!inCategory && !inType) return false;
  }

  const target = params.target?.trim();
  if (target && !(m.targetCategory?.includes(target) ?? false)) {
    return false;
  }

  const region = params.region?.trim();
  if (region && !matchesBrowseRegion(m, "", "", region)) {
    return false;
  }

  const q = params.q?.trim().toLowerCase();
  if (q) {
    const hay = [
      m.name,
      m.location,
      m.region,
      m.city,
      m.district,
      m.type,
      ...(m.tags ?? []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!hay.includes(q)) return false;
  }

  const minPrice = params.minPrice;
  const maxPrice = params.maxPrice;
  if (
    (minPrice != null && Number.isFinite(minPrice)) ||
    (maxPrice != null && Number.isFinite(maxPrice))
  ) {
    const { priceWon } = resolveMediaDisplayPrice(m);
    if (minPrice != null && Number.isFinite(minPrice) && priceWon < minPrice) {
      return false;
    }
    if (maxPrice != null && Number.isFinite(maxPrice) && priceWon > maxPrice) {
      return false;
    }
  }

  return true;
}

export function sortMapCatalogItems(
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
    case "popular":
    case "default":
    default:
      return arr.sort(compareMediaPopularRank);
  }
}

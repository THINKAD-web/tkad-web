import type { MediaItem } from "@/lib/media-data";
import type { PublicMediaSort } from "@/lib/public-media-query";
import { expandMediaRegionChip } from "@/lib/media-discovery-filter-chips";
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

function includesInsensitive(
  hay: string | undefined | null,
  needle: string,
): boolean {
  if (!hay) return false;
  return hay.toLowerCase().includes(needle.toLowerCase());
}

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
  if (region) {
    const aliases = expandMediaRegionChip(region);
    const match = aliases.some((alias) => {
      const needle = alias.toLowerCase();
      return (
        includesInsensitive(m.region, needle) ||
        includesInsensitive(m.city, needle) ||
        includesInsensitive(m.district, needle) ||
        includesInsensitive(m.regionZone, needle) ||
        includesInsensitive(m.location, needle) ||
        includesInsensitive(m.name, needle) ||
        includesInsensitive(m.nearbyStations, needle) ||
        includesInsensitive(m.nearbyLandmarks, needle)
      );
    });
    if (!match) return false;
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
      return arr.sort((a, b) => a.price - b.price);
    case "price_desc":
      return arr.sort((a, b) => b.price - a.price);
    case "popular":
    case "default":
    default:
      return arr.sort(
        (a, b) =>
          (b.dailyFootTraffic ?? 0) - (a.dailyFootTraffic ?? 0) ||
          (b.popularityScore ?? 0) - (a.popularityScore ?? 0) ||
          (b.createdAt && a.createdAt
            ? Date.parse(b.createdAt) - Date.parse(a.createdAt)
            : 0),
      );
  }
}

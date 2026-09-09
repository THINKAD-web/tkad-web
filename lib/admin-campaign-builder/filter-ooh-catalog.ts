import type { MediaCatalogListItem } from "@/lib/media-catalog-list-dto";

export type OohCatalogFilter = {
  q?: string;
  region?: string;
  type?: string;
  minPrice?: number;
  maxPrice?: number;
};

function matchesQuery(item: MediaCatalogListItem, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const hay = [item.name, item.location, item.region, item.slug ?? ""]
    .join(" ")
    .toLowerCase();
  return hay.includes(needle);
}

function matchesRegion(item: MediaCatalogListItem, region: string): boolean {
  const needle = region.trim().toLowerCase();
  if (!needle) return true;
  return (
    item.region.toLowerCase().includes(needle) ||
    item.location.toLowerCase().includes(needle)
  );
}

export function filterOohCatalog(
  items: MediaCatalogListItem[],
  filter: OohCatalogFilter,
): MediaCatalogListItem[] {
  const type = filter.type?.trim() || undefined;

  return items.filter((item) => {
    if (type && item.type !== type) return false;
    if (!matchesRegion(item, filter.region ?? "")) return false;
    if (!matchesQuery(item, filter.q ?? "")) return false;
    if (filter.minPrice != null && item.price < filter.minPrice) return false;
    if (filter.maxPrice != null && item.price > filter.maxPrice) return false;
    return true;
  });
}

export function uniqueOohRegions(items: MediaCatalogListItem[]): string[] {
  const set = new Set<string>();
  for (const item of items) {
    if (item.region.trim()) set.add(item.region.trim());
  }
  return [...set].sort((a, b) => a.localeCompare(b, "ko"));
}

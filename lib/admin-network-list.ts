import {
  resolveNetworkCatalogType,
  resolveNetworkVenueCode,
  type NetworkCatalogType,
} from "@/lib/media-network-types";
import { browseRegionLabel } from "@/lib/media-browse-regions";

export type AdminNetworkListRow = {
  id: string;
  name: string;
  nameEn: string | null;
  type: string;
  tags: string[];
  totalLocations: number;
  regions: string[];
  pricePackage: number | null;
  isActive: boolean;
  updatedAt: string;
  _count: { locations: number };
  /** Flattened location names for client-side search */
  locationNames: string[];
};

export type NetworkTypeFilter = "all" | NetworkCatalogType;
export type NetworkPublicFilter = "all" | "public" | "hidden";

type RawNetworkRow = {
  id: string;
  name: string;
  nameEn?: string | null;
  type: string;
  tags?: string[] | null;
  totalLocations: number;
  regions?: string[] | null;
  pricePackage?: number | null;
  isActive: boolean;
  updatedAt: Date | string;
  _count?: { locations: number };
  locations?: Array<{ name?: string | null }> | null;
};

export function toAdminNetworkListRow(raw: RawNetworkRow): AdminNetworkListRow {
  const locations = raw.locations ?? [];
  const locationNames = locations
    .map((l) => (typeof l.name === "string" ? l.name.trim() : ""))
    .filter(Boolean);

  return {
    id: raw.id,
    name: raw.name,
    nameEn: raw.nameEn ?? null,
    type: raw.type,
    tags: raw.tags ?? [],
    totalLocations: raw.totalLocations,
    regions: raw.regions ?? [],
    pricePackage: raw.pricePackage ?? null,
    isActive: raw.isActive,
    updatedAt:
      raw.updatedAt instanceof Date
        ? raw.updatedAt.toISOString()
        : String(raw.updatedAt),
    _count: raw._count ?? { locations: locationNames.length },
    locationNames,
  };
}

/** Search haystack — network name + location names (mediaRegionHaystack pattern). */
export function adminNetworkSearchHaystack(row: AdminNetworkListRow): string {
  const parts: string[] = [
    row.name,
    row.nameEn ?? "",
    ...row.locationNames,
    ...row.regions,
    ...row.tags,
  ];
  return parts.filter(Boolean).join(" ").toLowerCase();
}

export function resolveRowCatalogType(row: AdminNetworkListRow): NetworkCatalogType {
  const venue = resolveNetworkVenueCode(row.type, row.tags);
  if (venue) return resolveNetworkCatalogType(venue);
  return resolveNetworkCatalogType(row.type);
}

export function matchesNetworkTypeFilter(
  row: AdminNetworkListRow,
  filter: NetworkTypeFilter,
): boolean {
  if (filter === "all") return true;
  return resolveRowCatalogType(row) === filter;
}

export function matchesNetworkPublicFilter(
  row: AdminNetworkListRow,
  filter: NetworkPublicFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "public") return row.isActive;
  return !row.isActive;
}

export function filterAdminNetworks(
  rows: AdminNetworkListRow[],
  opts: {
    search: string;
    typeFilter: NetworkTypeFilter;
    publicFilter: NetworkPublicFilter;
  },
): AdminNetworkListRow[] {
  const q = opts.search.trim().toLowerCase();
  return rows.filter((row) => {
    if (!matchesNetworkTypeFilter(row, opts.typeFilter)) return false;
    if (!matchesNetworkPublicFilter(row, opts.publicFilter)) return false;
    if (q && !adminNetworkSearchHaystack(row).includes(q)) return false;
    return true;
  });
}

export function formatNetworkRegionsSummary(
  regions: string[],
  locale: string,
): string {
  if (regions.length === 0) return "—";
  return regions
    .slice(0, 4)
    .map((id) => {
      const main = browseRegionLabel(id, locale, "main");
      if (main !== id) return main;
      return id.replace(/_/g, " ");
    })
    .join(" · ");
}

export function formatNetworkUpdatedAt(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(locale.startsWith("ko") ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

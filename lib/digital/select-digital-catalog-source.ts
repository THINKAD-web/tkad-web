import type { DigitalCatalogItem } from "@/lib/planner/digital-catalog-types";

export type ResolvedDigitalCatalogSource = "local" | "unavailable";

export type CatalogFetchSide = {
  ok: boolean;
  items: DigitalCatalogItem[];
  count: number;
  fetchedAt: string;
  error?: string;
};

export type SelectedDigitalCatalog = {
  items: DigitalCatalogItem[];
  count: number;
  fetchedAt: string;
  source: ResolvedDigitalCatalogSource;
  localOk: boolean;
};

/** PR5-c commit 7 — local online catalog only. */
export function selectDigitalCatalogSource(
  local: CatalogFetchSide,
): SelectedDigitalCatalog {
  const localOk = local.ok && local.items.length > 0;
  if (localOk) {
    return {
      items: local.items,
      count: local.count,
      fetchedAt: local.fetchedAt,
      source: "local",
      localOk: true,
    };
  }
  return {
    items: [],
    count: 0,
    fetchedAt: new Date().toISOString(),
    source: "unavailable",
    localOk: false,
  };
}

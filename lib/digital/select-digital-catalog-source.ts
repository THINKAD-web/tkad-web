import type { DigitalCatalogItem } from "@/lib/planner/digital-catalog-types";

export type ResolvedDigitalCatalogSource =
  | "local"
  | "dmpilot"
  | "unavailable";

export type CatalogFetchSide = {
  ok: boolean;
  items: DigitalCatalogItem[];
  count: number;
  fetchedAt: string;
  error?: string;
};

export type SelectDigitalCatalogInput = {
  forceLocal: boolean;
  local: CatalogFetchSide;
  remote: CatalogFetchSide;
};

export type SelectedDigitalCatalog = {
  items: DigitalCatalogItem[];
  count: number;
  fetchedAt: string;
  source: ResolvedDigitalCatalogSource;
  localOk: boolean;
  remoteOk: boolean;
  forceLocal: boolean;
  usedDmpilotFallback: boolean;
};

/**
 * PR5-c commit 2 — default local SSOT; dmpilot remains fallback until commit 7.
 * `forceLocal`: skip dmpilot path entirely (no fallback when local empty).
 */
export function selectDigitalCatalogSource(
  input: SelectDigitalCatalogInput,
): SelectedDigitalCatalog {
  const { forceLocal, local, remote } = input;
  const localOk = local.ok && local.items.length > 0;
  const remoteOk = remote.ok && remote.items.length > 0;

  if (forceLocal) {
    if (localOk) {
      return {
        items: local.items,
        count: local.count,
        fetchedAt: local.fetchedAt,
        source: "local",
        localOk: true,
        remoteOk: false,
        forceLocal: true,
        usedDmpilotFallback: false,
      };
    }
    return {
      items: [],
      count: 0,
      fetchedAt: new Date().toISOString(),
      source: "unavailable",
      localOk: false,
      remoteOk: false,
      forceLocal: true,
      usedDmpilotFallback: false,
    };
  }

  if (localOk) {
    return {
      items: local.items,
      count: local.count,
      fetchedAt: local.fetchedAt,
      source: "local",
      localOk: true,
      remoteOk,
      forceLocal: false,
      usedDmpilotFallback: false,
    };
  }

  if (remoteOk) {
    return {
      items: remote.items,
      count: remote.count,
      fetchedAt: remote.fetchedAt,
      source: "dmpilot",
      localOk: false,
      remoteOk: true,
      forceLocal: false,
      usedDmpilotFallback: true,
    };
  }

  return {
    items: [],
    count: 0,
    fetchedAt: new Date().toISOString(),
    source: "unavailable",
    localOk: false,
    remoteOk: false,
    forceLocal: false,
    usedDmpilotFallback: false,
  };
}

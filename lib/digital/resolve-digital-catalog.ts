import { isDigitalForceLocal } from "@/lib/digital/force-local";
import { fetchLocalDigitalCatalog } from "@/lib/digital/local-catalog-fetch";
import {
  compareDigitalCatalogItems,
  logDigitalCatalogCompare,
} from "@/lib/digital/catalog-compare-log";
import { fetchDigitalCatalogInternal } from "@/lib/planner/digital-catalog-fetch";
import type {
  DigitalCatalogItem,
  DigitalCatalogResponse,
} from "@/lib/planner/digital-catalog-types";

export type ResolvedDigitalCatalogSource =
  | "local"
  | "dmpilot"
  | "local-fallback";

export type ResolvedDigitalCatalog = {
  items: DigitalCatalogItem[];
  count: number;
  fetchedAt: string;
  source: ResolvedDigitalCatalogSource;
  localOk: boolean;
  remoteOk: boolean;
  forceLocal: boolean;
};

export type ResolveDigitalCatalogOptions = {
  /** Home landing — local SSOT even before commit 2 bridge flip. */
  preferLocal?: boolean;
};

/**
 * PR5-c commit 1 — fetch local + dmpilot, log compare, pick source.
 * Default: dmpilot when available (commit 2 flips default to local).
 * `DIGITAL_FORCE_LOCAL=1`: local only (skip dmpilot fetch).
 */
export async function resolveDigitalCatalogItems(
  opts?: ResolveDigitalCatalogOptions,
): Promise<ResolvedDigitalCatalog> {
  const forceLocal = isDigitalForceLocal();
  const preferLocal = opts?.preferLocal === true;
  const local = await fetchLocalDigitalCatalog();

  if (forceLocal) {
    if (local.ok) {
      return {
        items: local.items,
        count: local.count,
        fetchedAt: local.fetchedAt,
        source: "local",
        localOk: true,
        remoteOk: false,
        forceLocal: true,
      };
    }
    return {
      items: [],
      count: 0,
      fetchedAt: new Date().toISOString(),
      source: "local",
      localOk: false,
      remoteOk: false,
      forceLocal: true,
    };
  }

  const remote = await fetchDigitalCatalogInternal();

  if (local.ok && remote.ok) {
    const compare = compareDigitalCatalogItems(local.items, remote.data.items);
    logDigitalCatalogCompare(compare, "resolveDigitalCatalogItems");
  } else if (local.ok && !remote.ok) {
    console.warn("[resolveDigitalCatalogItems] dmpilot unavailable; local only", {
      error: remote.error,
      localCount: local.count,
    });
  } else if (!local.ok && remote.ok) {
    console.warn("[resolveDigitalCatalogItems] local unavailable; dmpilot only", {
      error: local.error,
      remoteCount: remote.data.count,
    });
  }

  if (local.ok && preferLocal) {
    return {
      items: local.items,
      count: local.count,
      fetchedAt: local.fetchedAt,
      source: "local",
      localOk: true,
      remoteOk: remote.ok,
      forceLocal: false,
    };
  }

  if (remote.ok) {
    return {
      items: remote.data.items,
      count: remote.data.count,
      fetchedAt: remote.data.fetchedAt,
      source: "dmpilot",
      localOk: local.ok,
      remoteOk: true,
      forceLocal: false,
    };
  }

  if (local.ok) {
    return {
      items: local.items,
      count: local.count,
      fetchedAt: local.fetchedAt,
      source: "local-fallback",
      localOk: true,
      remoteOk: false,
      forceLocal: false,
    };
  }

  return {
    items: [],
    count: 0,
    fetchedAt: new Date().toISOString(),
    source: "local-fallback",
    localOk: false,
    remoteOk: false,
    forceLocal: false,
  };
}

export function toDigitalCatalogResponse(
  resolved: ResolvedDigitalCatalog,
): DigitalCatalogResponse {
  return {
    items: resolved.items,
    count: resolved.count,
    fetchedAt: resolved.fetchedAt,
  };
}

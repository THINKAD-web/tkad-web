import "@/lib/digital/server-only";
import { isDigitalForceLocal } from "@/lib/digital/force-local";
import { fetchLocalDigitalCatalog } from "@/lib/digital/local-catalog-fetch";
import {
  compareDigitalCatalogItems,
  logDigitalCatalogCompare,
} from "@/lib/digital/catalog-compare-log";
import {
  selectDigitalCatalogSource,
  type ResolvedDigitalCatalogSource,
  type SelectedDigitalCatalog,
} from "@/lib/digital/select-digital-catalog-source";
import { fetchDigitalCatalogInternal } from "@/lib/planner/digital-catalog-fetch";
import type { DigitalCatalogResponse } from "@/lib/planner/digital-catalog-types";

export type { ResolvedDigitalCatalogSource };

export type ResolvedDigitalCatalog = SelectedDigitalCatalog;

/**
 * PR5-c — local-first catalog resolution; dmpilot M2M kept as fallback (removed commit 7).
 * `DIGITAL_FORCE_LOCAL=1`: local only, no dmpilot fetch.
 */
export async function resolveDigitalCatalogItems(): Promise<ResolvedDigitalCatalog> {
  const forceLocal = isDigitalForceLocal();
  const localFetched = await fetchLocalDigitalCatalog();

  const local = {
    ok: localFetched.ok,
    items: localFetched.ok ? localFetched.items : [],
    count: localFetched.ok ? localFetched.count : 0,
    fetchedAt: localFetched.ok ? localFetched.fetchedAt : new Date().toISOString(),
    error: localFetched.ok ? undefined : localFetched.error,
  };

  if (forceLocal) {
    const selected = selectDigitalCatalogSource({ forceLocal: true, local, remote: {
      ok: false,
      items: [],
      count: 0,
      fetchedAt: "",
    } });
    if (!selected.localOk) {
      console.warn("[resolveDigitalCatalogItems] forceLocal but local unavailable", {
        error: local.error,
      });
    }
    return selected;
  }

  const remoteFetched = await fetchDigitalCatalogInternal();
  const remote = {
    ok: remoteFetched.ok,
    items: remoteFetched.ok ? remoteFetched.data.items : [],
    count: remoteFetched.ok ? remoteFetched.data.count : 0,
    fetchedAt: remoteFetched.ok
      ? remoteFetched.data.fetchedAt
      : new Date().toISOString(),
    error: remoteFetched.ok ? undefined : remoteFetched.error,
  };

  if (local.ok && remote.ok) {
    const compare = compareDigitalCatalogItems(local.items, remote.items);
    logDigitalCatalogCompare(compare, "resolveDigitalCatalogItems");
  } else if (local.ok && !remote.ok) {
    console.warn("[resolveDigitalCatalogItems] dmpilot unavailable; using local", {
      error: remote.error,
      localCount: local.count,
    });
  } else if (!local.ok && remote.ok) {
    console.warn(
      "[resolveDigitalCatalogItems] local unavailable; dmpilot fallback",
      { error: local.error, remoteCount: remote.count },
    );
  } else {
    console.error("[resolveDigitalCatalogItems] local and dmpilot unavailable", {
      localError: local.error,
      remoteError: remote.error,
    });
  }

  return selectDigitalCatalogSource({ forceLocal: false, local, remote });
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

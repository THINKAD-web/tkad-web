import "@/lib/digital/server-only";
import { isDigitalForceLocal } from "@/lib/digital/force-local";
import { fetchLocalDigitalCatalog } from "@/lib/digital/local-catalog-fetch";
import {
  selectDigitalCatalogSource,
  type ResolvedDigitalCatalogSource,
  type SelectedDigitalCatalog,
} from "@/lib/digital/select-digital-catalog-source";
import type { DigitalCatalogResponse } from "@/lib/planner/digital-catalog-types";

export type { ResolvedDigitalCatalogSource };

export type ResolvedDigitalCatalog = SelectedDigitalCatalog;

/**
 * PR5-c commit 7 — local online catalog only (dmpilot M2M removed).
 * `DIGITAL_FORCE_LOCAL=1` remains until commit 7 follow-up cleanup.
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

  const selected = selectDigitalCatalogSource({
    forceLocal: true,
    local,
    remote: {
      ok: false,
      items: [],
      count: 0,
      fetchedAt: "",
    },
  });

  if (!selected.localOk) {
    console.warn("[resolveDigitalCatalogItems] local catalog unavailable", {
      error: local.error,
      forceLocal,
    });
  }

  return selected;
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

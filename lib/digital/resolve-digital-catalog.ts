import "@/lib/digital/server-only";
import { fetchLocalDigitalCatalog } from "@/lib/digital/local-catalog-fetch";
import {
  selectDigitalCatalogSource,
  type ResolvedDigitalCatalogSource,
  type SelectedDigitalCatalog,
} from "@/lib/digital/select-digital-catalog-source";
import type { DigitalCatalogResponse } from "@/lib/planner/digital-catalog-types";

export type { ResolvedDigitalCatalogSource };

export type ResolvedDigitalCatalog = SelectedDigitalCatalog;

/** PR5-c commit 7 — local online catalog only. */
export async function resolveDigitalCatalogItems(): Promise<ResolvedDigitalCatalog> {
  const localFetched = await fetchLocalDigitalCatalog();

  const local = {
    ok: localFetched.ok,
    items: localFetched.ok ? localFetched.items : [],
    count: localFetched.ok ? localFetched.count : 0,
    fetchedAt: localFetched.ok ? localFetched.fetchedAt : new Date().toISOString(),
    error: localFetched.ok ? undefined : localFetched.error,
  };

  const selected = selectDigitalCatalogSource(local);

  if (!selected.localOk) {
    console.warn("[resolveDigitalCatalogItems] local catalog unavailable", {
      error: local.error,
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

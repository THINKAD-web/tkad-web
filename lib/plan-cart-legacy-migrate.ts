import { CART_KEY } from "@/lib/cart";
import type { MediaItem } from "@/lib/media-data";
import {
  addManyToPlanCart,
  getPlanCart,
  type BulkAddToPlanCartResult,
} from "@/lib/plan-cart";
import { planCartItemFromMediaItem } from "@/lib/plan-cart-item-builders";

export const LEGACY_CART_MIGRATED_FLAG = "tkad_legacy_cart_migrated_v1";

export type LegacyCartMigrateResult =
  | {
      status: "skipped";
      reason: "already_migrated" | "empty" | "no_browser" | "fetch_failed";
    }
  | {
      status: "done";
      migrated: number;
      skippedCatalog: number;
      skippedMax: number;
      skippedDuplicate: number;
    };

function readLegacyIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr)
      ? arr.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

function isMigrated(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(LEGACY_CART_MIGRATED_FLAG) === "1";
}

function markMigratedAndClearLegacy(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LEGACY_CART_MIGRATED_FLAG, "1");
  window.localStorage.removeItem(CART_KEY);
}

async function fetchCatalogItems(ids: string[]): Promise<MediaItem[] | null> {
  if (ids.length === 0) return [];
  try {
    const qs = new URLSearchParams();
    qs.set("priceMin", "0");
    const res = await fetch(`/api/media/map?${qs.toString()}`, {
      cache: "no-store",
    });
    const data = (await res.json()) as {
      ok?: boolean;
      data?: { items?: MediaItem[] };
    };
    if (!data.ok || !Array.isArray(data.data?.items)) return null;
    const idSet = new Set(ids);
    return data.data.items.filter((item) => idSet.has(item.id));
  } catch {
    return null;
  }
}

/** One-shot: legacy `tkad-media-cart-v1` string[] → plan cart items. */
export async function migrateLegacyCartToPlanCart(
  maxItems: number,
): Promise<LegacyCartMigrateResult> {
  if (typeof window === "undefined") {
    return { status: "skipped", reason: "no_browser" };
  }
  if (isMigrated()) {
    return { status: "skipped", reason: "already_migrated" };
  }

  const legacyIds = readLegacyIds();
  if (legacyIds.length === 0) {
    markMigratedAndClearLegacy();
    return { status: "skipped", reason: "empty" };
  }

  const existingIds = new Set(getPlanCart().items.map((item) => item.mediaId));
  const idsToMigrate = legacyIds.filter((id) => !existingIds.has(id));
  const skippedDuplicate = legacyIds.length - idsToMigrate.length;

  if (idsToMigrate.length === 0) {
    markMigratedAndClearLegacy();
    return {
      status: "done",
      migrated: 0,
      skippedCatalog: 0,
      skippedMax: 0,
      skippedDuplicate,
    };
  }

  const catalogItems = await fetchCatalogItems(idsToMigrate);
  if (catalogItems === null) {
    return { status: "skipped", reason: "fetch_failed" };
  }

  const foundIds = new Set(catalogItems.map((item) => item.id));
  const skippedCatalog = idsToMigrate.filter((id) => !foundIds.has(id)).length;

  const planItems = catalogItems.map((item) =>
    planCartItemFromMediaItem(item, "search"),
  );
  const bulk: BulkAddToPlanCartResult = addManyToPlanCart(planItems, maxItems);

  markMigratedAndClearLegacy();

  return {
    status: "done",
    migrated: bulk.added,
    skippedCatalog,
    skippedMax: bulk.skippedMax,
    skippedDuplicate: skippedDuplicate + bulk.skippedDuplicate,
  };
}

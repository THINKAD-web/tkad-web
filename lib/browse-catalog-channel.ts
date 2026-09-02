/**
 * PR4 — browse route ↔ DB `catalog_channel` filter resolution.
 */

import {
  CATALOG_CHANNEL_OFFLINE,
  CATALOG_CHANNEL_ONLINE,
  normalizeCatalogChannel,
  type CatalogChannel,
} from "@/lib/catalog-channel";
import { resolveBrowseCategoryParams } from "@/lib/media-browse-categories";
import { isOnlineBrowseMain } from "@/lib/online-browse-mains";

export type BrowseChannelRoute = "offline" | "online";

export type BrowseCatalogChannelFilterInput = {
  /** Route-fixed channel from `/media` vs `/media/online`. */
  browseChannel: BrowseChannelRoute;
  mainCategory?: string | null;
  subCategory?: string | null;
  category?: string | null;
  /** Optional explicit `?catalogChannel=` from client (must match route). */
  catalogChannel?: string | null;
};

/**
 * Resolves whether to add a Prisma `catalogChannel` WHERE clause.
 *
 * Legacy compatibility (dual-path, no 301): `/media?mainCategory=search` lives on
 * the offline route but must still return online inventory. When the URL names an
 * online browse main explicitly, we **omit** the offline-only guard so those rows
 * remain reachable at the legacy path.
 */
export function resolveBrowseCatalogChannelFilter(
  input: BrowseCatalogChannelFilterInput,
): CatalogChannel | null {
  const explicit = normalizeCatalogChannel(input.catalogChannel ?? null);
  if (explicit) return explicit;

  const resolved = resolveBrowseCategoryParams({
    mainCategory: input.mainCategory,
    subCategory: input.subCategory,
    category: input.category,
  });

  if (input.browseChannel === "online") {
    return CATALOG_CHANNEL_ONLINE;
  }

  const legacyOnlineMainExplicit =
    resolved.mainCategory != null &&
    isOnlineBrowseMain(resolved.mainCategory);

  if (legacyOnlineMainExplicit) {
    return null;
  }

  return CATALOG_CHANNEL_OFFLINE;
}

/** Drop cross-channel main chips (online route must not keep offline mains). */
export function sanitizeBrowseMainForChannel(
  browseChannel: BrowseChannelRoute,
  mainCategory: string,
): string {
  const trimmed = mainCategory.trim();
  if (!trimmed) return "";
  if (browseChannel === "online") {
    return isOnlineBrowseMain(trimmed) ? trimmed : "";
  }
  return trimmed;
}

export function mediaItemMatchesBrowseCatalogChannel(
  item: { catalogChannel?: string | null },
  channel: CatalogChannel | null,
): boolean {
  if (!channel) return true;
  const row = normalizeCatalogChannel(item.catalogChannel ?? null);
  return row === channel;
}

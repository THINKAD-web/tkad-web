/**
 * Explicit catalog_channel ← media_main_category maps (PR1a/PR1b SSOT).
 * Positive matches only — no NOT-online fallbacks.
 */

import type { CatalogChannel } from "@/lib/catalog-channel";
import {
  CATALOG_CHANNEL_OFFLINE,
  CATALOG_CHANNEL_ONLINE,
} from "@/lib/catalog-channel";
import {
  isOfflineBrowseMain,
  isOnlineBrowseMain,
  normalizeBrowseMainId,
  OFFLINE_BROWSE_MAIN_IDS,
  ONLINE_BROWSE_MAIN_IDS,
} from "@/lib/online-browse-mains";

export function resolveCatalogChannelFromBrowseMain(
  mediaMainCategory: string | null | undefined,
): CatalogChannel | null {
  const main = normalizeBrowseMainId(mediaMainCategory);
  if (!main) return null;
  if (isOnlineBrowseMain(main)) return CATALOG_CHANNEL_ONLINE;
  if (isOfflineBrowseMain(main)) return CATALOG_CHANNEL_OFFLINE;
  return null;
}

/** SQL forward map reference (mirrors pr1a forward + PR1b online mains). */
export const CATALOG_CHANNEL_FORWARD_MAP = {
  offline: [...OFFLINE_BROWSE_MAIN_IDS],
  online: [...ONLINE_BROWSE_MAIN_IDS],
} as const;

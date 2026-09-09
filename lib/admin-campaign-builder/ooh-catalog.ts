import {
  CATALOG_CHANNEL_ONLINE,
  canonicalCatalogChannel,
} from "@/lib/catalog-channel";
import { mediaItemsToCatalogListItems } from "@/lib/media-catalog-list-dto";
import type { MediaCatalogListItem } from "@/lib/media-catalog-list-dto";
import { fetchPublicMediaCatalogList } from "@/lib/public-media-catalog";

/** OOH builder panel — offline catalog rows only (excludes online channel). */
export async function loadOohCatalogItems(): Promise<MediaCatalogListItem[]> {
  const items = await fetchPublicMediaCatalogList();
  const list = mediaItemsToCatalogListItems(items);
  return list.filter(
    (item) =>
      canonicalCatalogChannel(item.catalogChannel) !== CATALOG_CHANNEL_ONLINE,
  );
}

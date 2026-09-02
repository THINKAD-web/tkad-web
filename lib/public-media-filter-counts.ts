import { unstable_cache } from "next/cache";
import {
  resolveBrowseCatalogChannelFilter,
  mediaItemMatchesBrowseCatalogChannel,
} from "@/lib/browse-catalog-channel";
import type { BrowseChannelRoute } from "@/lib/browse-catalog-channel";
import { buildBrowseFilterOptionCounts } from "@/lib/media-browse-filter-option-counts";
import type { BrowseFilterOptionCounts } from "@/lib/media-browse-filter-option-counts";
import {
  fetchPublicMediaCatalogList,
  PUBLIC_MEDIA_CATALOG_LIST_CACHE_TAG,
  PUBLIC_MEDIA_CATALOG_REVALIDATE_SECONDS,
} from "@/lib/public-media-catalog";

function filterCatalogByBrowseChannel(
  items: Awaited<ReturnType<typeof fetchPublicMediaCatalogList>>,
  browseChannel: BrowseChannelRoute,
) {
  const channel = resolveBrowseCatalogChannelFilter({
    browseChannel,
    mainCategory: null,
  });
  if (!channel) return items;
  return items.filter((m) => mediaItemMatchesBrowseCatalogChannel(m, channel));
}

const getCachedPublicMediaFilterCounts = unstable_cache(
  async (
    browseChannel: BrowseChannelRoute,
  ): Promise<BrowseFilterOptionCounts> => {
    const items = await fetchPublicMediaCatalogList();
    const scoped = filterCatalogByBrowseChannel(items, browseChannel);
    return buildBrowseFilterOptionCounts(scoped);
  },
  ["public-media-filter-counts-v2"],
  {
    revalidate: PUBLIC_MEDIA_CATALOG_REVALIDATE_SECONDS,
    tags: [PUBLIC_MEDIA_CATALOG_LIST_CACHE_TAG],
  },
);

/** Browse filter chip counts — server-precomputed, same invalidation as public catalog. */
export async function fetchPublicMediaFilterCounts(
  browseChannel: BrowseChannelRoute = "offline",
): Promise<BrowseFilterOptionCounts> {
  return getCachedPublicMediaFilterCounts(browseChannel);
}

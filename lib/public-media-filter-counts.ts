import { unstable_cache } from "next/cache";
import { buildBrowseFilterOptionCounts } from "@/lib/media-browse-filter-option-counts";
import type { BrowseFilterOptionCounts } from "@/lib/media-browse-filter-option-counts";
import {
  fetchPublicMediaCatalogList,
  PUBLIC_MEDIA_CATALOG_CACHE_TAG,
  PUBLIC_MEDIA_CATALOG_REVALIDATE_SECONDS,
} from "@/lib/public-media-catalog";

const getCachedPublicMediaFilterCounts = unstable_cache(
  async (): Promise<BrowseFilterOptionCounts> => {
    const items = await fetchPublicMediaCatalogList();
    return buildBrowseFilterOptionCounts(items);
  },
  ["public-media-filter-counts-v1"],
  {
    revalidate: PUBLIC_MEDIA_CATALOG_REVALIDATE_SECONDS,
    tags: [PUBLIC_MEDIA_CATALOG_CACHE_TAG],
  },
);

/** Browse filter chip counts — server-precomputed, same invalidation as public catalog. */
export async function fetchPublicMediaFilterCounts(): Promise<BrowseFilterOptionCounts> {
  return getCachedPublicMediaFilterCounts();
}

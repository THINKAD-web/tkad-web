import { unstable_cache } from "next/cache";
import { PUBLIC_MEDIA_CATALOG_CACHE_TAG } from "@/lib/media-catalog-cache-tags";
import { fetchPublicMediaCatalogCore } from "@/lib/public-media-catalog";

/** 서울 CPM 벤치마크 집계용 공개 카탈로그 (1h) */
export const getSeoulBenchmarkCatalogCached = unstable_cache(
  async () => fetchPublicMediaCatalogCore(),
  ["seoul-benchmark-catalog-detail"],
  { revalidate: 3600, tags: [PUBLIC_MEDIA_CATALOG_CACHE_TAG] },
);

import type { HomeCatalogMediaItem } from "@/types/media";
import type { MediaItem } from "@/lib/media-data";
import type { BrowseChannelRoute } from "@/lib/browse-catalog-channel";
import { mapMediaItemToHomeCatalog } from "@/lib/media-catalog-map";
import { queryMergedMediaBrowse } from "@/lib/merged-media-browse";

/** `/media`, `/media/online` 클라이언트 기본 정렬(popular)·페이지 크기와 동일해야
 * mount 시 `mountSsrFetchKey` 가 일치해 중복 fetch 를 skip 한다 (media-search-page.tsx). */
const MEDIA_BROWSE_DEFAULT_PAGE_SIZE = 30;

/**
 * `/media`, `/media/online` 앱 셸의 첫 페이지 데이터를 서버에서 미리 가져온다.
 * 이전에는 필터 없는 기본 목록도 클라이언트 마운트 후 fetch 해서, SSR HTML이
 * 빈 로딩 스켈레톤만 내려가 SEO 색인/체감 로딩에 불리했다 (사이트 점검 6·8번).
 */
export async function fetchDefaultMediaBrowsePage(
  browseChannel: BrowseChannelRoute,
): Promise<{
  initialMedia: HomeCatalogMediaItem[];
  initialCatalogItems: MediaItem[];
  initialTotal: number;
}> {
  try {
    const { data, total } = await queryMergedMediaBrowse({
      browseChannel,
      sort: "popular",
      page: 1,
      limit: MEDIA_BROWSE_DEFAULT_PAGE_SIZE,
    });
    return {
      initialMedia: data.map(mapMediaItemToHomeCatalog),
      initialCatalogItems: data,
      initialTotal: total,
    };
  } catch (e) {
    console.error(
      "[fetchDefaultMediaBrowsePage] failed — page shell falls back to client-side fetch",
      e instanceof Error ? `${e.name}: ${e.message}` : e,
    );
    return { initialMedia: [], initialCatalogItems: [], initialTotal: 0 };
  }
}

import { Suspense } from "react";
import { MediaSearchPage } from "@/components/media/media-search-page";
import {
  countPublicMediaCatalog,
  fetchFilteredMediaCatalogItems,
} from "@/lib/media-catalog";
import { mapMediaItemToHomeCatalog } from "@/lib/media-catalog-map";
import { resolveLocaleParam } from "@/lib/resolve-locale";

export const revalidate = 60;

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
};

/**
 * `/media` — 고정 앱 셸(fixed app shell).
 * 마케팅 히어로 + discovery 서브네비 + 전역 푸터는 이 라우트에서 제거한다.
 * 푸터는 root layout 을 건드리지 않고 `.tkad-media-app-shell` 마커(globals.css `:has()`)로 숨긴다.
 */
export default async function MediaPage({ params, searchParams }: Props) {
  await resolveLocaleParam(params);
  const sp = await searchParams;

  const catalogOpts = {
    sort: "popular" as const,
    limit: 30,
    category: sp.category,
    target: sp.target,
    region: sp.region,
  };

  const [initialCatalogItems, initialTotal] = await Promise.all([
    fetchFilteredMediaCatalogItems(catalogOpts).catch(() => []),
    countPublicMediaCatalog({
      category: sp.category,
      target: sp.target,
      region: sp.region,
    }).catch(() => 0),
  ]);
  const initialMedia = initialCatalogItems.map(mapMediaItemToHomeCatalog);

  return (
    <Suspense fallback={null}>
      <MediaSearchPage
        appShell
        initialMedia={initialMedia}
        initialCatalogItems={initialCatalogItems}
        initialTotal={initialTotal}
        initialCategory={sp.category}
        initialTarget={sp.target}
        initialRegion={sp.region}
      />
    </Suspense>
  );
}

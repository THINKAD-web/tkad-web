import { Suspense } from "react";
import { getTrustMetrics, formatTrustCount } from "@/lib/trust-metrics";
import { MediaSearchPage } from "@/components/media/media-search-page";
import { PageHero } from "@/components/layout/page-hero";
import { SubTabsBar } from "@/components/layout/sub-tabs-bar";
import {
  countPublicMediaCatalog,
  fetchFilteredMediaCatalog,
  fetchFilteredMediaCatalogItems,
} from "@/lib/media-catalog";
import { mapMediaItemToHomeCatalog } from "@/lib/media-catalog-map";

export const revalidate = 60;

type Props = {
  searchParams: Promise<{ [key: string]: string | undefined }>;
};

export default async function MediaPage({ searchParams }: Props) {
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
  const trust = await getTrustMetrics();
  const verifiedLabel = formatTrustCount(trust.mediaCount);

  return (
    <>
      <PageHero
        eyebrow="// 01 · DISCOVERY"
        title="전국 "
        highlight="OOH 매체"
        titleEnd=" 검색"
        description={`${verifiedLabel} 검증 매체를 유형·지역·목적별로 탐색하세요`}
      />
      <SubTabsBar group="discovery" currentPath="/media" />
      <Suspense fallback={null}>
        <MediaSearchPage
          initialMedia={initialMedia}
          initialCatalogItems={initialCatalogItems}
          initialTotal={initialTotal}
          initialCategory={sp.category}
          initialTarget={sp.target}
          initialRegion={sp.region}
        />
      </Suspense>
    </>
  );
}

import { Suspense } from "react";
import { getTrustMetrics, formatTrustCount } from "@/lib/trust-metrics";
import { MediaSearchPage } from "@/components/media/media-search-page";
import { PageHero } from "@/components/layout/page-hero";
import { SubTabsBar } from "@/components/layout/sub-tabs-bar";
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

export default async function MediaPage({ params, searchParams }: Props) {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko" || locale.startsWith("ko");
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
        title={isKo ? "전국 옥외광고 매체 — " : "Nationwide OOH media — "}
        highlight={isKo ? "단가·위치별 검색" : "pricing & location search"}
        description={
          isKo
            ? `${verifiedLabel} 검증 매체를 유형·지역·예산별로 탐색하세요`
            : `Browse ${verifiedLabel} verified placements by format, region, and budget`
        }
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

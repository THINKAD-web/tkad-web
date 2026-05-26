import { MediaSearchPage } from "@/components/media/media-search-page";
import { PageHero } from "@/components/layout/page-hero";
import { SubTabsBar } from "@/components/layout/sub-tabs-bar";
import {
  countPublicMediaCatalog,
  fetchFilteredMediaCatalog,
} from "@/lib/media-catalog";

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

  const [initialMedia, initialTotal] = await Promise.all([
    fetchFilteredMediaCatalog(catalogOpts).catch(() => []),
    countPublicMediaCatalog({
      category: sp.category,
      target: sp.target,
      region: sp.region,
    }).catch(() => 0),
  ]);

  return (
    <>
      <PageHero
        eyebrow="// 01 · DISCOVERY"
        title="전국 "
        highlight="OOH 매체"
        titleEnd=" 검색"
        description="500+ 검증 매체를 유형·지역·목적별로 탐색하세요"
      />
      <SubTabsBar group="discovery" currentPath="/media" />
      <MediaSearchPage
        initialMedia={initialMedia}
        initialTotal={initialTotal}
        initialCategory={sp.category}
        initialTarget={sp.target}
        initialRegion={sp.region}
      />
    </>
  );
}

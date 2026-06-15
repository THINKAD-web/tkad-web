import { Suspense } from "react";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { MediaSearchPage } from "@/components/media/media-search-page";
import { PageHero } from "@/components/layout/page-hero";
import { SubTabsBar } from "@/components/layout/sub-tabs-bar";
import {
  countNetworkCatalog,
  fetchFilteredNetworkCatalogItems,
} from "@/lib/network-media-catalog";
import { mapMediaItemToHomeCatalog } from "@/lib/media-catalog-map";
import { buildShareMetadata, pageAlternates } from "@/lib/seo";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { MEDIA_BROWSE_REGIONS } from "@/lib/media-browse-regions";

export const revalidate = 60;

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = await resolveLocaleParam(Promise.resolve({ locale: raw }));
  const isKo = locale.startsWith("ko");
  const title = isKo
    ? "네트워크 매체 — 전국 다지점 옥외광고 | THINKAD"
    : "Network OOH — Nationwide multi-site media | THINKAD";
  const description = isKo
    ? "대학교·편의점·엘리베이터·오피스·병원 등 전국 네트워크 매체를 유형·지역별로 검색하세요."
    : "Browse nationwide network OOH — campus, convenience, elevator, office, hospital and more.";
  return {
    title,
    description,
    alternates: pageAlternates(locale, "/media/network"),
    ...buildShareMetadata({
      locale,
      title,
      description,
      path: "/media/network",
    }),
  };
}

function resolveRegionMainLabel(id?: string): string | undefined {
  if (!id) return undefined;
  return MEDIA_BROWSE_REGIONS.find((r) => r.id === id)?.label ?? id;
}

export default async function MediaNetworkCatalogPage({
  params,
  searchParams,
}: Props) {
  const { locale: raw } = await params;
  const locale = await resolveLocaleParam(Promise.resolve({ locale: raw }));
  setRequestLocale(locale);
  const isKo = locale.startsWith("ko");
  const sp = await searchParams;

  const catalogOpts = {
    sort: "popular" as const,
    limit: 30,
    networkType: sp.networkType,
    regionMain: resolveRegionMainLabel(sp.regionMain),
    regionSub: sp.regionSub,
    q: sp.q,
  };

  const [initialCatalogItems, initialTotal] = await Promise.all([
    fetchFilteredNetworkCatalogItems(catalogOpts).catch(() => []),
    countNetworkCatalog(catalogOpts).catch(() => 0),
  ]);
  const initialMedia = initialCatalogItems.map(mapMediaItemToHomeCatalog);

  return (
    <>
      <PageHero
        eyebrow="// 01 · DISCOVERY"
        title={isKo ? "전국 " : "Nationwide "}
        highlight={isKo ? "네트워크 매체" : "network OOH"}
        titleEnd={isKo ? " 검색" : " search"}
        description={
          isKo
            ? "대학교·편의점·엘리베이터·오피스·병원 등 다지점 네트워크를 유형·지역별로 탐색하세요"
            : "Explore multi-site network packages by type and region"
        }
      />
      <SubTabsBar group="discovery" currentPath="/media/network" />
      <Suspense fallback={null}>
        <MediaSearchPage
          catalogVariant="network"
          initialMedia={initialMedia}
          initialCatalogItems={initialCatalogItems}
          initialTotal={initialTotal}
          initialNetworkType={sp.networkType}
          initialRegion={sp.regionMain}
        />
      </Suspense>
    </>
  );
}

import type { Metadata } from "next";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { buildShareMetadata, pageAlternates } from "@/lib/seo";
import { HomeHeroBanner } from "@/components/home/home-hero-banner";
import { HomeTwoAxis } from "@/components/home/home-two-axis";
import { HomeExploreSplit } from "@/components/home/home-explore-split";
import { HomeMediaScroll } from "@/components/home/home-media-scroll";
import { HomeContentFeed } from "@/components/home/home-content-feed";
import { fetchPublicMediaCatalog } from "@/lib/media-catalog";
import { fetchPublishedReports } from "@/lib/report-queries";
import { fetchPublishedCases } from "@/lib/case-queries";
import {
  getPublicMediaCountLabel,
  homePageMetadataTitle,
  homePageSrOnlyH1,
} from "@/lib/trust-metrics";

export const revalidate = 1800;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  const verifiedMediaLabel = await getPublicMediaCountLabel("verified");
  const title = homePageMetadataTitle(locale, verifiedMediaLabel);
  const description = isKo
    ? "실시간 월 단가·예상 노출로 전광판·지하철·버스·DOOH를 비교하고 즉시 견적. THINKAD 싱커드."
    : "Compare monthly rates and estimated reach for billboards, subway, bus, and DOOH — instant quotes on THINKAD.";
  return {
    title: { absolute: title },
    description,
    alternates: pageAlternates(locale, ""),
    ...buildShareMetadata({
      locale,
      title,
      description,
      path: "",
      image: { kind: "default" },
    }),
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isKo = locale === "ko" || locale.startsWith("ko");
  const verifiedMediaLabel = await getPublicMediaCountLabel("verified");

  const [popularMedia, reportItems, caseItems] = await Promise.all([
    fetchPublicMediaCatalog({ sort: "popular", limit: 8 }).catch(() => []),
    fetchPublishedReports({ limit: 3 }).catch(() => []),
    fetchPublishedCases({ limit: 3, locale }).catch(() => []),
  ]);

  return (
    <main
      id="main-content"
      className="tkad-quiet min-h-screen bg-gray-50 dark:bg-[#020202]"
    >
      <h1 className="sr-only">
        {homePageSrOnlyH1(locale, verifiedMediaLabel)}
      </h1>
      <HomeHeroBanner />

      <HomeTwoAxis />

      <HomeExploreSplit />

      <HomeMediaScroll
        title={isKo ? "이번 주 인기 매체" : "Popular this week"}
        media={popularMedia}
        locale={locale}
      />

      <HomeContentFeed
        reports={reportItems}
        cases={caseItems}
        locale={locale}
      />
    </main>
  );
}

import type { Metadata } from "next";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { buildShareMetadata, pageAlternates } from "@/lib/seo";
import { HomeHeroBanner } from "@/components/home/home-hero-banner";
import { HomeTwoAxis } from "@/components/home/home-two-axis";
import { HomeExploreSplit } from "@/components/home/home-explore-split";
import { HomePlannerLanding } from "@/components/home/home-planner-landing";
import { fetchPublicMediaCatalog } from "@/lib/media-catalog";
import { fetchPublishedReports } from "@/lib/report-queries";
import { fetchPublishedCases } from "@/lib/case-queries";
import { getHomeLandingCoverageTiles } from "@/lib/home-landing-media-grid";
import {
  getPublicMediaCountLabel,
  homePageMetadataTitle,
  homePageSrOnlyH1,
} from "@/lib/trust-metrics";

export const revalidate = 3600;

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
  const verifiedMediaLabel = await getPublicMediaCountLabel("verified");

  const [popularMedia, reportItems, caseItems, coverage] = await Promise.all([
    fetchPublicMediaCatalog({ sort: "popular", limit: 8 }).catch(() => []),
    fetchPublishedReports({ limit: 3 }).catch(() => []),
    fetchPublishedCases({ limit: 3, locale }).catch(() => []),
    getHomeLandingCoverageTiles(),
  ]);

  return (
    <main
      id="main-content"
      className="tkad-quiet min-h-screen bg-gray-50 dark:bg-[#020202]"
    >
      <h1 className="sr-only">
        {homePageSrOnlyH1(locale, verifiedMediaLabel)}
      </h1>
      <HomeHeroBanner mediaCountLabel={verifiedMediaLabel} />

      <HomeTwoAxis />

      <HomeExploreSplit />

      <HomePlannerLanding
        mediaCountLabel={verifiedMediaLabel}
        oohTiles={coverage.ooh}
        digitalTiles={coverage.digital}
        popularMedia={popularMedia}
        reports={reportItems}
        cases={caseItems}
      />
    </main>
  );
}

import { resolveLocaleParam } from "@/lib/resolve-locale";
import { getPublishedInsightReports } from "@/lib/public-content-queries";
import { serializeJsonLd } from "@/lib/seo";
import { buildCollectionPageJsonLd } from "@/lib/structured-data";
import InsightsPageClient from "./insights-page-client";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function InsightsPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  const initialReports = await getPublishedInsightReports();
  const collectionLd = buildCollectionPageJsonLd(locale, {
    path: "/insights",
    name: locale === "ko" ? "THINKAD OOH 인사이트" : "THINKAD OOH Insights",
    description:
      locale === "ko"
        ? "한국 OOH 시장과 DOOH 흐름을 다루는 THINKAD 인사이트 리포트 모음입니다."
        : "A collection of THINKAD insight reports on the Korea OOH and DOOH market.",
    items: initialReports.slice(0, 12).map((report) => ({
      name: locale === "ko" ? report.titleKo : report.titleEn,
      path: report.slug ? `/insights/${report.slug}` : "/insights",
      description:
        locale === "ko"
          ? report.summaryKo[0]
          : report.summaryEn[0] ?? report.titleEn,
      datePublished: report.publishedIso,
    })),
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(collectionLd) }}
      />
      <InsightsPageClient initialReports={initialReports} />
    </>
  );
}

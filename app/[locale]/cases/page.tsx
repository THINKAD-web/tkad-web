import { resolveLocaleParam } from "@/lib/resolve-locale";
import { getPublishedSuccessCases } from "@/lib/public-content-queries";
import { serializeJsonLd } from "@/lib/seo";
import { buildCollectionPageJsonLd } from "@/lib/structured-data";
import CasesPageClient from "./cases-page-client";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function CasesPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  const initialCases = await getPublishedSuccessCases();
  const collectionLd = buildCollectionPageJsonLd(locale, {
    path: "/cases",
    name: locale === "ko" ? "THINKAD 성공 사례" : "THINKAD Case Studies",
    description:
      locale === "ko"
        ? "THINKAD의 OOH 캠페인 성공 사례 모음입니다."
        : "A collection of THINKAD OOH campaign case studies.",
    items: initialCases.slice(0, 12).map((cs) => ({
      name: locale === "ko" ? cs.titleKo : cs.titleEn ?? cs.titleKo,
      path: `/cases/${cs.id}`,
      description:
        locale === "ko"
          ? cs.summaryKo
          : `${cs.titleEn ?? cs.titleKo} case study from THINKAD.`,
      datePublished: cs.publishedAtIso ?? undefined,
    })),
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(collectionLd) }}
      />
      <CasesPageClient initialCases={initialCases} />
    </>
  );
}

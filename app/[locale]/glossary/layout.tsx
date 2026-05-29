import type { Metadata } from "next";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { pageAlternates, segmentOpenGraphImages, serializeJsonLd, siteUrl } from "@/lib/seo";
import { ogAltForRoute } from "@/lib/og-route-copy";
import { buildBreadcrumbJsonLd } from "@/lib/structured-data";
import { GLOSSARY_TERMS } from "@/lib/glossary-data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  const title = isKo ? "옥외광고 용어집" : "OOH Glossary";
  const description = isKo
    ? "OOH 광고 / DOOH / 빌보드 / 디지털 사이니지 / CPM / GRP 등 옥외광고 캠페인 기획·견적 시 자주 마주치는 용어를 한눈에. THINKAD 가 검증한 산업 표준 정의."
    : "Glossary of OOH, DOOH, billboard, digital signage, CPM, GRP, and other key terms for OOH campaign planning. Industry-standard definitions verified by THINKAD.";
  return {
    title,
    description,
    keywords: isKo
      ? [
          "옥외광고 용어",
          "OOH 용어",
          "DOOH",
          "CPM",
          "GRP",
          "빌보드",
          "디지털 사이니지",
          "디지털 옥외광고",
          "프로그래매틱 DOOH",
          "THINKAD 용어집",
        ]
      : [
          "OOH glossary",
          "DOOH glossary",
          "CPM",
          "GRP",
          "billboard",
          "digital signage",
          "programmatic DOOH",
        ],
    alternates: pageAlternates(locale, "/glossary"),
    openGraph: {
      title,
      description,
      type: "website",
      images: segmentOpenGraphImages(
        locale,
        "glossary",
        ogAltForRoute("glossary"),
      ),
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

/**
 * DefinedTermSet JSON-LD — Google / Naver 의 검색결과에 사전형 리치 박스 후보.
 * 각 term 을 DefinedTerm 으로 매핑.
 */
function buildGlossaryJsonLd(locale: string) {
  const isKo = locale === "ko";
  const origin = siteUrl.replace(/\/$/, "");
  const setUrl = `${origin}/${locale}/glossary`;
  return {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    "@id": `${setUrl}#glossary`,
    name: isKo ? "THINKAD 옥외광고 용어집" : "THINKAD OOH Glossary",
    inLanguage: isKo ? "ko-KR" : "en-US",
    url: setUrl,
    hasDefinedTerm: GLOSSARY_TERMS.map((t) => ({
      "@type": "DefinedTerm",
      "@id": `${setUrl}#${t.id}`,
      name: isKo ? t.term : (t.termEn || t.term),
      description: isKo ? t.definitionKo : t.definitionEn,
      ...(t.termEn && t.termEn !== t.term
        ? { alternateName: isKo ? [t.termEn] : [t.term] }
        : {}),
      inDefinedTermSet: setUrl,
    })),
  };
}

export default async function GlossaryLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocaleParam(params);
  const ld = [
    buildGlossaryJsonLd(locale),
    buildBreadcrumbJsonLd(locale, [
      { name: locale === "ko" ? "홈" : "Home", path: "" },
      { name: locale === "ko" ? "용어집" : "Glossary", path: "/glossary" },
    ]),
  ];
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(ld) }}
      />
      {children}
    </>
  );
}

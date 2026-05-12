import type { Metadata } from "next";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { ogAltForRoute } from "@/lib/og-route-copy";
import { pageAlternates, segmentOpenGraphImages, siteUrl } from "@/lib/seo";
import { FAQ_ITEMS } from "@/lib/faq-data";
import { buildBreadcrumbJsonLd } from "@/lib/structured-data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  const title = isKo ? "자주 묻는 질문" : "FAQ";
  const description = isKo
    ? "OOH 광고와 싱커드 서비스에 대해 자주 묻는 질문과 답변. 광고 진행 절차, 비용, 매체 선정 기준 등."
    : "Frequently asked questions about OOH advertising and THINKAD: process, budgets, and media selection.";
  const ogTitle = isKo
    ? "자주 묻는 질문 | THINKAD 싱커드"
    : "FAQ | THINKAD";
  const ogDesc = isKo
    ? "OOH 광고와 싱커드 서비스에 대해 자주 묻는 질문과 답변."
    : "Answers about OOH and THINKAD services.";
  return {
    title,
    description,
    alternates: pageAlternates(locale, "/faq"),
    openGraph: {
      title: ogTitle,
      description: ogDesc,
      images: segmentOpenGraphImages(locale, "faq", ogAltForRoute("faq")),
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDesc,
    },
  };
}

/**
 * FAQPage JSON-LD — Google / Naver 의 검색결과 Q&A 리치 박스 노출.
 * 모든 FAQ_ITEMS 를 mainEntity 로 등록.
 */
function buildFaqJsonLd(locale: string) {
  const isKo = locale === "ko";
  const origin = siteUrl.replace(/\/$/, "");
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${origin}/${locale}/faq#faq`,
    inLanguage: isKo ? "ko-KR" : "en-US",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: isKo ? item.questionKo : item.questionEn,
      acceptedAnswer: {
        "@type": "Answer",
        text: isKo ? item.answerKo : item.answerEn,
      },
    })),
  };
}

export default async function FaqLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocaleParam(params);
  const faqJsonLd = buildFaqJsonLd(locale);
  const breadcrumb = buildBreadcrumbJsonLd(locale, [
    { name: locale === "ko" ? "홈" : "Home", path: "" },
    { name: locale === "ko" ? "자주 묻는 질문" : "FAQ", path: "/faq" },
  ]);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([faqJsonLd, breadcrumb]),
        }}
      />
      {children}
    </>
  );
}

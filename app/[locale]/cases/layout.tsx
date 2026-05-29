import type { Metadata } from "next";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { ogAltForRoute } from "@/lib/og-route-copy";
import { pageAlternates, segmentOpenGraphImages, serializeJsonLd } from "@/lib/seo";
import {
  buildBreadcrumbJsonLd,
  buildCollectionPageJsonLd,
} from "@/lib/structured-data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  const title = isKo
    ? "OOH 광고 성공 사례 | THINKAD 싱커드"
    : "OOH advertising case studies | THINKAD";
  const description = isKo
    ? "실제 집행된 OOH 캠페인 사례와 성과 데이터를 확인하세요."
    : "Explore real OOH campaign case studies with verified performance data.";
  const ogTitle = title;
  return {
    title,
    description,
    alternates: pageAlternates(locale, "/cases"),
    openGraph: {
      title: ogTitle,
      description,
      images: segmentOpenGraphImages(locale, "cases", ogAltForRoute("casesList")),
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: segmentOpenGraphImages(locale, "cases", ogAltForRoute("casesList")),
    },
  };
}

export default async function CasesLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  const ld = [
    buildBreadcrumbJsonLd(locale, [
      { name: isKo ? "홈" : "Home", path: "" },
      { name: isKo ? "성공 사례" : "Cases", path: "/cases" },
    ]),
    buildCollectionPageJsonLd(locale, {
      path: "/cases",
      name: isKo ? "THINKAD 성공 사례" : "THINKAD Case Studies",
      description: isKo
        ? "THINKAD의 OOH 캠페인 성공 사례 모음입니다."
        : "A collection of THINKAD OOH campaign case studies.",
    }),
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

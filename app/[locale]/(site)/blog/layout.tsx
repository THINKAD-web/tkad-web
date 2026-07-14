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
  const title = isKo ? "블로그" : "Blog";
  const description = isKo
    ? "OOH 광고 트렌드, 사례 분석, 업계 인사이트. 싱커드 블로그에서 데이터 기반 미디어 전략을 만나보세요."
    : "OOH trends, case breakdowns, and industry insights from THINKAD.";
  const ogTitle = isKo
    ? "OOH 광고 블로그 | THINKAD 싱커드"
    : "OOH blog | THINKAD";
  return {
    title,
    description,
    alternates: pageAlternates(locale, "/blog"),
    openGraph: {
      title: ogTitle,
      description,
      images: segmentOpenGraphImages(locale, "blog", ogAltForRoute("blog")),
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: segmentOpenGraphImages(locale, "blog", ogAltForRoute("blog")),
    },
  };
}

export default async function BlogLayout({
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
      { name: isKo ? "블로그" : "Blog", path: "/blog" },
    ]),
    buildCollectionPageJsonLd(locale, {
      path: "/blog",
      name: isKo ? "THINKAD 블로그" : "THINKAD Blog",
      description: isKo
        ? "OOH 트렌드와 사례를 모은 THINKAD 블로그입니다."
        : "THINKAD's collection of OOH trends, case breakdowns, and insights.",
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

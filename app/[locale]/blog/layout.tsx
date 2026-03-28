import type { Metadata } from "next";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { ogAltForRoute } from "@/lib/og-route-copy";
import { pageAlternates, segmentOpenGraphImages } from "@/lib/seo";

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
    },
  };
}

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

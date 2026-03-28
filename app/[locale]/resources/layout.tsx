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
  const title = isKo ? "리소스 & 인사이트" : "Resources & insights";
  const description = isKo
    ? "최신 OOH 광고 트렌드, 가이드, 성공 사례 리포트. 데이터 기반 인사이트로 효과적인 광고 전략을 수립하세요."
    : "OOH trends, guides, and reports—data-backed insights for stronger media plans.";
  const ogTitle = isKo
    ? "OOH 광고 리소스 & 인사이트 | THINKAD 싱커드"
    : "OOH resources & insights | THINKAD";
  const ogDesc = isKo
    ? "최신 OOH 광고 트렌드, 가이드, 성공 사례 리포트."
    : "Trends, guides, and success-story reports for OOH.";
  return {
    title,
    description,
    alternates: pageAlternates(locale, "/resources"),
    openGraph: {
      title: ogTitle,
      description: ogDesc,
      images: segmentOpenGraphImages(
        locale,
        "resources",
        ogAltForRoute("resources"),
      ),
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDesc,
    },
  };
}

export default function ResourcesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

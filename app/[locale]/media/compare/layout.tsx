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
  const title = isKo ? "매체 비교" : "Compare media";
  const description = isKo
    ? "옥외광고 매체를 최대 3개까지 나란히 비교하세요. 위치, 노출, CPM, 가시성을 한눈에 확인합니다."
    : "Compare up to 3 OOH placements side by side: location, impressions, CPM, and visibility.";
  const ogTitle = isKo
    ? "매체 비교 | THINKAD 싱커드"
    : "OOH media comparison | THINKAD";
  const ogDesc = isKo
    ? "옥외광고 매체를 나란히 비교 분석하세요."
    : "Side-by-side analysis for outdoor advertising options.";
  return {
    title,
    description,
    alternates: pageAlternates(locale, "/media/compare"),
    openGraph: {
      title: ogTitle,
      description: ogDesc,
      images: segmentOpenGraphImages(locale, "compare", ogAltForRoute("compare")),
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDesc,
    },
  };
}

export default function MediaCompareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

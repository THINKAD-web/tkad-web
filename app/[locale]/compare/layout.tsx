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
    ? "옥외광고 매체를 나란히 비교하세요. 위치, 노출량, 가격, ROI를 한눈에 비교 분석."
    : "Compare OOH placements side by side: location, impressions, pricing, and ROI.";
  const ogTitle = isKo
    ? "매체 비교 | THINKAD 싱커드"
    : "OOH media comparison | THINKAD";
  const ogDesc = isKo
    ? "옥외광고 매체를 나란히 비교 분석하세요."
    : "Side-by-side analysis for outdoor advertising options.";
  return {
    title,
    description,
    alternates: pageAlternates(locale, "/compare"),
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

export default function CompareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

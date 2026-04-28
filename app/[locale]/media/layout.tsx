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
  const title = isKo ? "매체 검색" : "Media search";
  const description = isKo
    ? "전국 500+ 검증된 옥외광고 매체를 한눈에 검색하고 비교하세요. 빌보드, 디지털 사이니지, 교통광고, 지하철 광고 등."
    : "Search and compare 500+ verified OOH media nationwide: billboards, digital signage, transit, and subway ads.";
  const ogTitle = isKo
    ? "옥외광고 매체 검색 | THINKAD 싱커드"
    : "OOH media search | THINKAD";
  return {
    title,
    description,
    keywords: isKo
      ? [
          "옥외광고",
          "OOH",
          "매체 검색",
          "디지털 사이니지",
          "빌보드",
          "버스 광고",
          "지하철 광고",
          "THINKAD",
        ]
      : [
          "OOH",
          "out-of-home",
          "media search",
          "digital signage",
          "billboard",
          "transit ads",
          "THINKAD",
        ],
    alternates: pageAlternates(locale, "/media"),
    openGraph: {
      title: ogTitle,
      description,
      images: segmentOpenGraphImages(locale, "media", ogAltForRoute("media")),
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
    },
  };
}

export default function MediaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

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
  const title = isKo
    ? "지도에서 찾기 | THINKAD 싱커드"
    : "Map search | THINKAD";
  const description = isKo
    ? "위치 기반으로 주변 OOH 매체를 지도에서 탐색하세요."
    : "Explore nearby OOH media on an interactive map.";
  return {
    title,
    description,
    alternates: pageAlternates(locale, "/media/map"),
    openGraph: {
      title,
      description,
      images: segmentOpenGraphImages(
        locale,
        "media/map",
        ogAltForRoute("map"),
      ),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function MediaMapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

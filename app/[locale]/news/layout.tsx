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
  const title = isKo ? "뉴스" : "News";
  const description = isKo
    ? "THINKAD 보도자료, 수상 소식, 이벤트 및 업계 뉴스를 한곳에서 확인하세요."
    : "Press releases, awards, events, and updates from THINKAD.";
  const ogTitle = isKo
    ? "뉴스 & 보도자료 | THINKAD 싱커드"
    : "News & press | THINKAD";
  return {
    title,
    description,
    alternates: pageAlternates(locale, "/news"),
    openGraph: {
      title: ogTitle,
      description,
      images: segmentOpenGraphImages(locale, "news", ogAltForRoute("news")),
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
    },
  };
}

export default function NewsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

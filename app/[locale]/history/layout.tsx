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
  const title = isKo ? "연혁" : "History";
  const description = isKo
    ? "2016년 설립 이후 싱커드(THINKAD)가 걸어온 OOH 광고 에이전시의 발자취와 주요 이정표."
    : "Milestones since 2016—how THINKAD grew into Korea's OOH partner.";
  const ogTitle = isKo
    ? "회사 연혁 | THINKAD 싱커드"
    : "Our history | THINKAD";
  return {
    title,
    description,
    alternates: pageAlternates(locale, "/history"),
    openGraph: {
      title: ogTitle,
      description,
      images: segmentOpenGraphImages(locale, "history", ogAltForRoute("history")),
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: segmentOpenGraphImages(locale, "history", ogAltForRoute("history")),
    },
  };
}

export default function HistoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

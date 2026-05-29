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
  const title = isKo ? "회사 소개" : "About";
  const description = isKo
    ? "싱커드(THINKAD)는 2016년 설립된 대한민국 No.1 OOH 광고 에이전시입니다. 15년 이상의 업력과 100+ 대기업 파트너."
    : "THINKAD, founded in 2016, is Korea's leading OOH agency with 15+ years of experience and 100+ enterprise partners.";
  const ogTitle = isKo
    ? "회사 소개 | THINKAD 싱커드"
    : "About THINKAD | Korea OOH agency";
  return {
    title,
    description,
    alternates: pageAlternates(locale, "/about"),
    openGraph: {
      title: ogTitle,
      description: isKo
        ? "2016년 설립, 15년 이상 OOH 업력, 100+ 대기업 파트너."
        : "Founded 2016 · 15+ years in OOH · 100+ enterprise partners.",
      images: segmentOpenGraphImages(locale, "about", ogAltForRoute("about")),
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: segmentOpenGraphImages(locale, "about", ogAltForRoute("about")),
    },
  };
}

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

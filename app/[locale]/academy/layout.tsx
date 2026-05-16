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
  const title = isKo ? "OOH 광고 아카데미" : "OOH advertising academy";
  const description = isKo
    ? "옥외광고 기초, 매체 선정, 예산·집행 가이드. 광고 초보도 따라 할 수 있는 THINKAD 교육 허브입니다."
    : "OOH basics, media selection, budget and execution guides for first-time advertisers.";
  const ogTitle = isKo
    ? "THINKAD OOH 아카데미"
    : "THINKAD OOH Academy";
  return {
    title,
    description,
    alternates: pageAlternates(locale, "/academy"),
    openGraph: {
      title: ogTitle,
      description,
      images: segmentOpenGraphImages(locale, "academy", ogAltForRoute("academy")),
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
    },
  };
}

export default function AcademyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

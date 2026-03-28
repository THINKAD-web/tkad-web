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
  const title = isKo ? "견적 요청" : "Request a quote";
  const description = isKo
    ? "OOH 광고 견적을 무료로 요청하세요. 예산, 매체, 기간에 맞는 맞춤형 견적을 빠르게 받아보세요."
    : "Request a free OOH quote tailored to your budget, media mix, and flight dates.";
  const ogTitle = isKo
    ? "OOH 광고 견적 요청 | THINKAD 싱커드"
    : "OOH quote request | THINKAD";
  const ogDesc = isKo
    ? "예산, 매체, 기간에 맞는 맞춤형 견적을 빠르게 받아보세요."
    : "Get a tailored estimate for your OOH campaign.";
  return {
    title,
    description,
    alternates: pageAlternates(locale, "/quote"),
    openGraph: {
      title: ogTitle,
      description: ogDesc,
      images: segmentOpenGraphImages(locale, "quote", ogAltForRoute("quote")),
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDesc,
    },
  };
}

export default function QuoteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

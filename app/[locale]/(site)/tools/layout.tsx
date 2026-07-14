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
  const title = isKo ? "광고 도구" : "Ad tools";
  const description = isKo
    ? "OOH 광고 ROI 계산기, 매체 효과 분석 등 무료 광고 도구를 활용하세요."
    : "Free OOH tools: ROI calculators and media performance helpers.";
  const ogTitle = isKo
    ? "OOH 광고 도구 | THINKAD 싱커드"
    : "OOH ad tools | THINKAD";
  const ogDesc = isKo
    ? "OOH 광고 ROI 계산기, 매체 효과 분석 등 무료 광고 도구."
    : "ROI calculators and media analysis tools for OOH.";
  return {
    title,
    description,
    alternates: pageAlternates(locale, "/tools"),
    openGraph: {
      title: ogTitle,
      description: ogDesc,
      images: segmentOpenGraphImages(locale, "tools", ogAltForRoute("tools")),
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDesc,
      images: segmentOpenGraphImages(locale, "tools", ogAltForRoute("tools")),
    },
  };
}

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

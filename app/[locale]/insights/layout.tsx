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
  const title = isKo ? "OOH 트렌드 인사이트" : "OOH trend insights";
  const description = isKo
    ? "월간·분기별 한국 OOH 시장 트렌드, DOOH 동향, 업종별 전략 보고서를 PDF와 온라인 뷰어로 제공합니다."
    : "Monthly and quarterly Korea OOH market trends, DOOH outlook, and vertical playbooks—PDF and online viewer.";
  const ogTitle = isKo
    ? "OOH 트렌드 인사이트 보고서 | THINKAD"
    : "OOH trend insight reports | THINKAD";
  return {
    title,
    description,
    alternates: pageAlternates(locale, "/insights"),
    openGraph: {
      title: ogTitle,
      description,
      images: segmentOpenGraphImages(
        locale,
        "insights",
        ogAltForRoute("insights"),
      ),
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
    },
  };
}

export default function InsightsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

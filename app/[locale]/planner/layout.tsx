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
  const title = isKo ? "미디어 플래너" : "Media Planner";
  const description = isKo
    ? "지역·매체 유형·예산·기간을 입력해 옥외광고 예상 노출과 ROI 시나리오를 시뮬레이션하세요."
    : "Simulate OOH reach and ROI by region, media type, budget, and campaign length.";
  const ogTitle = isKo
    ? "OOH 미디어 플래너 | THINKAD 싱커드"
    : "OOH media planner | THINKAD";
  return {
    title,
    description,
    alternates: pageAlternates(locale, "/planner"),
    openGraph: {
      title: ogTitle,
      description,
      images: segmentOpenGraphImages(locale, "planner", ogAltForRoute("planner")),
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
    },
  };
}

export default function PlannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

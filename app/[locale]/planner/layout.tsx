import type { Metadata } from "next";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { ogAltForRoute } from "@/lib/og-route-copy";
import { pageAlternates, segmentOpenGraphImages } from "@/lib/seo";
import { buildBreadcrumbJsonLd } from "@/lib/structured-data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  const title = isKo ? "옥외광고 시뮬레이션 플래너" : "OOH advertising simulation";
  const description = isKo
    ? "옥외광고가 실제로 걸린 듯한 시뮬레이션으로 예상 노출·ROI를 확인하세요. 지역·매체·예산·기간을 맞춰 맞춤 플랜을 만듭니다."
    : "Simulate how your OOH campaign could perform—estimated impressions and ROI from region, media mix, budget, and duration.";
  const ogTitle = isKo
    ? "옥외광고 시뮬레이션 | THINKAD"
    : "OOH advertising simulation | THINKAD";
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

export default async function PlannerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocaleParam(params);
  const breadcrumb = buildBreadcrumbJsonLd(locale, [
    { name: locale === "ko" ? "홈" : "Home", path: "" },
    { name: locale === "ko" ? "미디어 플래너" : "Media Planner", path: "/planner" },
  ]);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {children}
    </>
  );
}

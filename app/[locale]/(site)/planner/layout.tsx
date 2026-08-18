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
  const title = isKo
    ? "미디어 플래너 | THINKAD"
    : "Media Planner | THINKAD";
  const description = isKo
    ? "브리프 → 믹스 → 결과, 3단계로 캠페인 플랜을 만듭니다."
    : "Brief → mix → result — build a campaign plan in three steps.";
  const ogTitle = title;
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
      images: segmentOpenGraphImages(locale, "planner", ogAltForRoute("planner")),
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

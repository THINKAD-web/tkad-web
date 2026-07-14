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
    ? "OOH 미디어 플래너 | THINKAD 싱커드"
    : "OOH media planner | THINKAD";
  const description = isKo
    ? "예산과 타겟을 입력하면 AI가 최적 매체 조합과 예상 성과를 3분 안에 제안합니다."
    : "Enter budget and target audience—get an AI-recommended media mix and forecast in about 3 minutes.";
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

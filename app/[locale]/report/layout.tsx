import type { Metadata } from "next";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { ogAltForRoute } from "@/lib/og-route-copy";
import { pageAlternates, segmentOpenGraphImages, serializeJsonLd } from "@/lib/seo";
import {
  buildBreadcrumbJsonLd,
  buildCollectionPageJsonLd,
} from "@/lib/structured-data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  const title = isKo ? "OOH 트렌드 리포트" : "OOH trend reports";
  const description = isKo
    ? "광고 업계 인사이트와 매체 트렌드를 정리합니다."
    : "Industry insight and OOH media trend reports.";
  const ogTitle = isKo
    ? "OOH 트렌드 리포트 | THINKAD 싱커드"
    : "OOH trend reports | THINKAD";
  return {
    title,
    description,
    alternates: pageAlternates(locale, "/report"),
    openGraph: {
      title: ogTitle,
      description,
      images: segmentOpenGraphImages(locale, "report", ogAltForRoute("report")),
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
    },
  };
}

export default async function ReportLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  const ld = [
    buildBreadcrumbJsonLd(locale, [
      { name: isKo ? "홈" : "Home", path: "" },
      { name: isKo ? "트렌드 리포트" : "Trend reports", path: "/report" },
    ]),
    buildCollectionPageJsonLd(locale, {
      path: "/report",
      name: isKo ? "THINKAD OOH 트렌드 리포트" : "THINKAD OOH trend reports",
      description: isKo
        ? "광고 업계 인사이트와 매체 트렌드를 정리합니다."
        : "Industry insight and OOH media trend reports.",
    }),
  ];
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(ld) }}
      />
      {children}
    </>
  );
}

import type { Metadata } from "next";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { ogAltForRoute } from "@/lib/og-route-copy";
import { pageAlternates, segmentOpenGraphImages } from "@/lib/seo";
import {
  buildBreadcrumbJsonLd,
  buildMediaCatalogItemListJsonLd,
} from "@/lib/structured-data";
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  const title = isKo
    ? "전국 OOH 매체 검색 | THINKAD 싱커드"
    : "OOH media search nationwide | THINKAD";
  const description = isKo
    ? "강남, 홍대, 성수 등 전국 500+ 검증된 옥외광고 매체를 지역·유형·예산별로 검색하세요."
    : "Search 500+ verified OOH media across Korea by region, format, and budget — Gangnam, Hongdae, Seongsu, and more.";
  const ogTitle = title;
  return {
    title,
    description,
    keywords: isKo
      ? [
          "옥외광고",
          "OOH",
          "매체 검색",
          "디지털 사이니지",
          "빌보드",
          "버스 광고",
          "지하철 광고",
          "THINKAD",
        ]
      : [
          "OOH",
          "out-of-home",
          "media search",
          "digital signage",
          "billboard",
          "transit ads",
          "THINKAD",
        ],
    alternates: pageAlternates(locale, "/media"),
    openGraph: {
      title: ogTitle,
      description,
      images: segmentOpenGraphImages(locale, "media", ogAltForRoute("media")),
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
    },
  };
}

/**
 * /media 카탈로그 — ItemList + BreadcrumbList JSON-LD.
 * 카탈로그 fetch 실패해도 layout 은 깨지지 않도록 try/catch.
 */
function safeJsonLdStringify(value: unknown): string | null {
  try {
    return JSON.stringify(value, (_k, v) =>
      typeof v === "bigint" ? v.toString() : v,
    ).replace(/</g, "\\u003c");
  } catch (e) {
    console.error("[media/layout] JSON-LD serialization failed", e);
    return null;
  }
}

export default async function MediaLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocaleParam(params);

  let itemList: Record<string, unknown> | null = null;
  try {
    const catalog = await fetchPublicMediaCatalog();
    if (catalog.length > 0) {
      itemList = buildMediaCatalogItemListJsonLd(
        locale,
        catalog.map((m) => ({
          id: m.id,
          slug: m.slug,
          name: m.name,
          nameEn: m.nameEn,
          location: m.location,
          locationEn: m.locationEn,
        })),
        30,
      );
    }
  } catch (e) {
    console.error("[media/layout] catalog fetch or ItemList build failed", e);
  }

  const breadcrumb = buildBreadcrumbJsonLd(locale, [
    { name: locale === "ko" ? "홈" : "Home", path: "" },
    { name: locale === "ko" ? "옥외광고 매체" : "OOH media", path: "/media" },
  ]);

  const ld = itemList ? [itemList, breadcrumb] : [breadcrumb];
  const ldHtml = safeJsonLdStringify(ld);

  return (
    <>
      {ldHtml ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: ldHtml }}
        />
      ) : null}
      {children}
    </>
  );
}

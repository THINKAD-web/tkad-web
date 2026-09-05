import type { Metadata } from "next";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { ogAltForRoute } from "@/lib/og-route-copy";
import { buildShareMetadata, pageAlternates } from "@/lib/seo";
import {
  buildBreadcrumbJsonLd,
  buildMediaCatalogItemListJsonLd,
} from "@/lib/structured-data";
import { fetchPublicMediaCatalogList } from "@/lib/public-media-catalog";
import {
  CATALOG_CHANNEL_ONLINE,
  canonicalCatalogChannel,
} from "@/lib/catalog-channel";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  const title = isKo
    ? "온라인 광고 매체 — 검색·디스플레이·SNS·영상"
    : "Online ads — search, display, social & video";
  const description = isKo
    ? "검색광고, 디스플레이, SNS, 영상, 메시지, 로컬·리테일 등 온라인 광고 매체를 THINKAD 카탈로그에서 탐색하세요."
    : "Browse search, display, social, video, messaging, and local retail ad products in the THINKAD catalog.";
  return {
    title: { absolute: title },
    description,
    keywords: isKo
      ? [
          "온라인 광고",
          "검색광고",
          "디스플레이 광고",
          "SNS 광고",
          "영상 광고",
          "THINKAD",
        ]
      : [
          "online advertising",
          "search ads",
          "display ads",
          "social ads",
          "video ads",
          "THINKAD",
        ],
    alternates: pageAlternates(locale, "/media/online"),
    ...buildShareMetadata({
      locale,
      title,
      description,
      path: "/media/online",
      alt: ogAltForRoute("mediaOnline"),
      image: { kind: "segment", segment: "media/online" },
    }),
  };
}

function safeJsonLdStringify(value: unknown): string | null {
  try {
    return JSON.stringify(value, (_k, v) =>
      typeof v === "bigint" ? v.toString() : v,
    ).replace(/</g, "\\u003c");
  } catch (e) {
    console.error("[media/online/layout] JSON-LD serialization failed", e);
    return null;
  }
}

export default async function MediaOnlineLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocaleParam(params);

  let itemList: Record<string, unknown> | null = null;
  try {
    const catalog = await fetchPublicMediaCatalogList();
    const online = catalog.filter(
      (m) => canonicalCatalogChannel(m.catalogChannel) === CATALOG_CHANNEL_ONLINE,
    );
    if (online.length > 0) {
      itemList = buildMediaCatalogItemListJsonLd(
        locale,
        online.map((m) => ({
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
    console.error("[media/online/layout] catalog fetch or ItemList build failed", e);
  }

  const breadcrumb = buildBreadcrumbJsonLd(locale, [
    { name: locale === "ko" ? "홈" : "Home", path: "" },
    {
      name: locale === "ko" ? "온라인 광고" : "Online ads",
      path: "/media/online",
    },
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

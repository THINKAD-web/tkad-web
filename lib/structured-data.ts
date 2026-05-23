import { KAKAO_CHANNEL_PUBLIC_URL } from "@/lib/kakao-public";
import { siteUrl } from "@/lib/seo";
import {
  buildMediaSeoJsonDescription,
  collectMediaSeoKeywordStrings,
} from "@/lib/media-seo";
import { mediaItemDetailPath } from "@/lib/media-slug";
import { getPrimaryMediaImageUrl, typeLabels, type MediaItem } from "@/lib/media-data";
import { catalogPriceFieldToWon } from "@/lib/media-price-format";
import type { PublicSuccessCaseDetail } from "@/lib/success-case-public";
import { CONTACT_EMAIL } from "@/lib/constants";

/** 푸터·SNS와 동일 (Organization sameAs / E-E-A-T) */
const INSTAGRAM_THINKAD = "https://www.instagram.com/thinkad_korea" as const;

const ORG_ID = `${siteUrl}/#organization`;
const LOCAL_ID = `${siteUrl}/#localbusiness`;
const WEBSITE_ID = `${siteUrl}/#website`;

/** Organization + LocalBusiness + WebSite JSON-LD for THINKAD. */
export function buildStructuredDataGraph(locale: string) {
  const isKo = locale === "ko";
  const localizedSiteUrl = `${siteUrl}/${locale}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORG_ID,
        name: "THINKAD 싱커드",
        legalName: "주식회사 싱커드",
        alternateName: ["THINKAD", "THINKAD Inc.", "싱커드"],
        url: siteUrl,
        logo: {
          "@type": "ImageObject",
          url: `${siteUrl}/pwa-icon/512`,
          width: 512,
          height: 512,
        },
        image: `${siteUrl}/pwa-icon/512`,
        description:
          "대한민국 No.1 OOH 광고 에이전시. 전국 옥외광고 매체 검색, 데이터 기반 캠페인 컨설팅, 집행 및 사후관리.",
        foundingDate: "2016",
        taxID: "319-86-00382",
        sameAs: [KAKAO_CHANNEL_PUBLIC_URL, INSTAGRAM_THINKAD],
        contactPoint: [
          {
            "@type": "ContactPoint",
            telephone: "+82-2-515-2772",
            email: CONTACT_EMAIL,
            contactType: "customer service",
            areaServed: "KR",
            availableLanguage: ["Korean", "English"],
          },
        ],
        areaServed: {
          "@type": "Country",
          name: "South Korea",
        },
        knowsAbout: [
          "Out-of-home advertising",
          "Digital out-of-home",
          "Billboard advertising",
          "OOH media planning",
        ],
      },
      {
        "@type": "LocalBusiness",
        "@id": LOCAL_ID,
        parentOrganization: { "@id": ORG_ID },
        name: "THINKAD 싱커드",
        image: `${siteUrl}/pwa-icon/512`,
        url: siteUrl,
        telephone: "+82-2-515-2772",
        email: CONTACT_EMAIL,
        address: {
          "@type": "PostalAddress",
          streetAddress: "뚝섬로17가길 48 성수에이원지식산업센터 1102호",
          addressLocality: "성동구",
          addressRegion: "서울특별시",
          postalCode: "04799",
          addressCountry: "KR",
        },
        geo: {
          "@type": "GeoCoordinates",
          latitude: 37.5407427,
          longitude: 127.0595201,
        },
        openingHoursSpecification: {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          opens: "09:00",
          closes: "18:00",
        },
        priceRange: "$$",
      },
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        url: siteUrl,
        name: isKo ? "THINKAD 싱커드" : "THINKAD",
        publisher: { "@id": ORG_ID },
        inLanguage: isKo ? "ko-KR" : "en-US",
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${localizedSiteUrl}/media?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
}

/**
 * 매체 상세 페이지용 Place JSON-LD.
 * Google Rich Results 의 LocalBusiness/Place 호환 형식.
 * `aggregateRating` 은 visibilityScore 0–100 → 1–5 스케일로 변환.
 */
export function buildMediaPlaceJsonLd(
  media: MediaItem,
  locale: string,
): Record<string, unknown> {
  const isKo = locale === "ko";
  const name = isKo ? media.name : media.nameEn || media.name;
  const description = buildMediaSeoJsonDescription(media, locale, 1100);
  const image = getPrimaryMediaImageUrl(media);
  const url = `${siteUrl}/${locale}${mediaItemDetailPath(media)}`;

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Place",
    "@id": `${url}#place`,
    name,
    description,
    url,
    address: {
      "@type": "PostalAddress",
      streetAddress: isKo ? media.location : media.locationEn || media.location,
      addressCountry: "KR",
    },
  };

  if (image) data.image = image;
  if (media.lat != null && media.lng != null) {
    data.geo = {
      "@type": "GeoCoordinates",
      latitude: media.lat,
      longitude: media.lng,
    };
  }
  if (typeof media.visibilityScore === "number" && media.visibilityScore > 0) {
    const ratingValue = Math.max(
      1,
      Math.min(5, Number((media.visibilityScore / 20).toFixed(1))),
    );
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue,
      bestRating: 5,
      worstRating: 1,
      ratingCount: Math.max(1, media.visibilityScore),
    };
  }

  const kw = collectMediaSeoKeywordStrings(media, locale, 28);
  if (kw.length) {
    data.keywords = kw.join(", ");
  }

  return data;
}

/**
 * 매체 상세 — Product + Offer JSON-LD (가격·위치·매체명).
 * Place 스키마와 함께 사용합니다.
 */
export function buildMediaProductJsonLd(
  media: MediaItem,
  locale: string,
): Record<string, unknown> {
  const isKo = locale === "ko";
  const name = isKo ? media.name : media.nameEn || media.name;
  const description = buildMediaSeoJsonDescription(media, locale, 1100);
  const image = getPrimaryMediaImageUrl(media);
  const url = `${siteUrl}/${locale}${mediaItemDetailPath(media)}`;
  const locationLabel = isKo
    ? media.location
    : media.locationEn || media.location;

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name,
    description,
    url,
    sku: media.id,
    brand: { "@id": ORG_ID },
    category: typeLabels[media.type]?.[isKo ? "ko" : "en"] ?? "OOH Media",
  };

  if (image) data.image = image;

  if (media.price > 0) {
    data.offers = {
      "@type": "Offer",
      price: catalogPriceFieldToWon(media.price),
      priceCurrency: "KRW",
      availability: "https://schema.org/InStock",
      url,
      seller: { "@id": ORG_ID },
      ...(locationLabel
        ? {
            availableAtOrFrom: {
              "@type": "Place",
              name: locationLabel,
              address: {
                "@type": "PostalAddress",
                streetAddress: locationLabel,
                addressCountry: "KR",
              },
            },
          }
        : {}),
    };
  }

  return data;
}

/** 성공 사례 상세 — Article JSON-LD */
export function buildSuccessCaseArticleJsonLd(
  row: PublicSuccessCaseDetail,
  locale: string,
): Record<string, unknown> {
  const isKo = locale === "ko";
  const url = `${siteUrl}/${locale}/cases/${row.id}`;
  const headline = (isKo ? row.titleKo : row.titleEn?.trim() || row.titleKo).slice(
    0,
    110,
  );
  const description = row.summaryKo.slice(0, 280);

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${url}#article`,
    headline,
    description,
    url,
    inLanguage: isKo ? "ko-KR" : "en-US",
    author: { "@id": ORG_ID },
    publisher: { "@id": ORG_ID },
    mainEntityOfPage: url,
    articleSection: isKo ? "OOH 성공 사례" : "OOH Case Studies",
    about: row.industry,
  };

  if (row.thumbnailUrl) data.image = row.thumbnailUrl;
  if (row.publishedAtIso) {
    data.datePublished = row.publishedAtIso;
    data.dateModified = row.publishedAtIso;
  }

  return data;
}

export function buildMediaBreadcrumbJsonLd(
  media: MediaItem,
  locale: string,
): Record<string, unknown> {
  const isKo = locale === "ko";
  const name = isKo ? media.name : media.nameEn || media.name;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: isKo ? "홈" : "Home",
        item: `${siteUrl}/${locale}`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: isKo ? "옥외광고 매체" : "OOH media",
        item: `${siteUrl}/${locale}/media`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name,
        item: `${siteUrl}/${locale}${mediaItemDetailPath(media)}`,
      },
    ],
  };
}


/**
 * 트렌드 리포트 (자동 발행) 상세 페이지용 Article JSON-LD.
 * Google Rich Results Article schema 호환.
 */
export function buildInsightArticleJsonLd(
  report: {
    titleKo: string;
    titleEn?: string;
    summaryKo: string[];
    summaryEn?: string[];
    publishedIso: string;
    slug: string;
    sources?: { url: string; title: string }[];
  },
  locale: string,
): Record<string, unknown> {
  const isKo = locale === "ko";
  const url = `${siteUrl}/${locale}/insights/${report.slug}`;
  const headline = isKo
    ? report.titleKo
    : report.titleEn?.trim() || report.titleKo;
  const summary = isKo
    ? report.summaryKo
    : report.summaryEn?.filter(Boolean).length
      ? report.summaryEn
      : report.summaryKo;
  const description = summary[0]?.slice(0, 280) ?? headline;
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${url}#article`,
    headline: headline.slice(0, 110),
    description,
    url,
    datePublished: report.publishedIso,
    dateModified: report.publishedIso,
    inLanguage: locale === "ko" ? "ko-KR" : "en-US",
    author: { "@id": ORG_ID },
    publisher: { "@id": ORG_ID },
    mainEntityOfPage: url,
  };
  if (report.sources && report.sources.length > 0) {
    data.citation = report.sources.slice(0, 10).map((s) => ({
      "@type": "CreativeWork",
      name: s.title,
      url: s.url,
    }));
  }
  return data;
}

export function buildInsightBreadcrumbJsonLd(
  report: { titleKo: string; titleEn?: string; slug: string },
  locale: string,
): Record<string, unknown> {
  const isKo = locale === "ko";
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: isKo ? "홈" : "Home",
        item: `${siteUrl}/${locale}`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: isKo ? "OOH 인사이트" : "OOH Insights",
        item: `${siteUrl}/${locale}/insights`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: (isKo ? report.titleKo : report.titleEn?.trim() || report.titleKo).slice(
          0,
          110,
        ),
        item: `${siteUrl}/${locale}/insights/${report.slug}`,
      },
    ],
  };
}

type CollectionPageItem = {
  name: string;
  path?: string;
  url?: string;
  description?: string;
  datePublished?: string;
};

export function buildCollectionPageJsonLd(
  locale: string,
  {
    path,
    name,
    description,
    items = [],
  }: {
    path: string;
    name: string;
    description: string;
    items?: CollectionPageItem[];
  },
): Record<string, unknown> {
  const isKo = locale === "ko";
  const origin = siteUrl.replace(/\/$/, "");
  const pageUrl = `${origin}/${locale}${path}`;

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${pageUrl}#collection`,
    url: pageUrl,
    name,
    description,
    inLanguage: isKo ? "ko-KR" : "en-US",
    isPartOf: { "@id": WEBSITE_ID },
    ...(items.length > 0
      ? {
          hasPart: items.map((item) => {
            const targetUrl = item.url ?? `${origin}/${locale}${item.path ?? ""}`;
            return {
              "@type": "Article",
              "@id": `${targetUrl}#item`,
              headline: item.name,
              url: targetUrl,
              ...(item.description ? { description: item.description } : {}),
              ...(item.datePublished
                ? {
                    datePublished: item.datePublished,
                    dateModified: item.datePublished,
                  }
                : {}),
            };
          }),
        }
      : {}),
  };
}

/**
 * 범용 BreadcrumbList JSON-LD 빌더.
 *
 * @example
 *   buildBreadcrumbJsonLd("ko", [
 *     { name: "홈", path: "" },
 *     { name: "서비스", path: "/services" },
 *   ]);
 *
 * `path` 는 locale 미포함 (`/services`, `/media/region/seoul`). 빈 문자열 = 홈.
 */
export function buildBreadcrumbJsonLd(
  locale: string,
  items: { name: string; path: string }[],
): Record<string, unknown> {
  const origin = siteUrl.replace(/\/$/, "");
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: it.name,
      item: `${origin}/${locale}${it.path}`,
    })),
  };
}

/**
 * `/media` 카탈로그 ItemList JSON-LD — 검색 리치 결과 / 매체 목록 노출용.
 * 카탈로그 전체 대신 상위 N개 ID 만 등록 (스키마 한도 + 페이로드 합리화).
 */
export function buildMediaCatalogItemListJsonLd(
  locale: string,
  items: {
    id: string;
    slug?: string | null;
    name: string;
    nameEn?: string;
    location: string;
    locationEn?: string;
  }[],
  limit = 30,
): Record<string, unknown> {
  const origin = siteUrl.replace(/\/$/, "");
  const isKo = locale === "ko";
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    numberOfItems: items.length,
    itemListElement: items.slice(0, limit).map((m, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      url: `${origin}/${locale}${mediaItemDetailPath(m)}`,
      name: isKo ? m.name : (m.nameEn || m.name),
      ...(m.location && {
        item: {
          "@type": "Place",
          name: isKo ? m.name : (m.nameEn || m.name),
          address: isKo ? m.location : (m.locationEn || m.location),
        },
      }),
    })),
  };
}

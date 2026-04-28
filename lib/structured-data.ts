import { KAKAO_CHANNEL_PUBLIC_URL } from "@/lib/kakao-public";
import { siteUrl } from "@/lib/seo";
import {
  buildMediaSeoJsonDescription,
  collectMediaSeoKeywordStrings,
} from "@/lib/media-seo";

/** 푸터·SNS와 동일 (Organization sameAs / E-E-A-T) */
const INSTAGRAM_THINKAD = "https://www.instagram.com/thinkad_korea" as const;
import type { MediaItem } from "@/lib/media-data";
import { getPrimaryMediaImageUrl } from "@/lib/media-data";

const ORG_ID = `${siteUrl}/#organization`;
const LOCAL_ID = `${siteUrl}/#localbusiness`;
const WEBSITE_ID = `${siteUrl}/#website`;

/** Organization + LocalBusiness + WebSite JSON-LD for THINKAD. */
export function buildStructuredDataGraph() {
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
            email: "mannote@tkad.co.kr",
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
        email: "mannote@tkad.co.kr",
        address: {
          "@type": "PostalAddress",
          streetAddress:
            "뚝섬로17가길 48 성수에이원지식산업센터 1102호",
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
        name: "THINKAD 싱커드",
        publisher: { "@id": ORG_ID },
        inLanguage: ["ko-KR", "en-US"],
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${siteUrl}/ko/media?q={search_term_string}`,
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
  const url = `${siteUrl}/${locale}/media/${media.id}`;

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
        item: `${siteUrl}/${locale}/media/${media.id}`,
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
    summaryKo: string[];
    publishedIso: string;
    slug: string;
    sources?: { url: string; title: string }[];
  },
  locale: string,
): Record<string, unknown> {
  const url = `${siteUrl}/${locale}/insights/${report.slug}`;
  const description =
    report.summaryKo[0]?.slice(0, 280) ?? report.titleKo;
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${url}#article`,
    headline: report.titleKo.slice(0, 110),
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
  report: { titleKo: string; slug: string },
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
        name: report.titleKo.slice(0, 110),
        item: `${siteUrl}/${locale}/insights/${report.slug}`,
      },
    ],
  };
}

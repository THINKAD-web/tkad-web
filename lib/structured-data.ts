import { siteUrl } from "@/lib/seo";

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
        sameAs: ["https://open.kakao.com/o/placeholder"],
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
          latitude: 37.5446,
          longitude: 127.0557,
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

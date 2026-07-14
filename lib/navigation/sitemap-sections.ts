import type { ResolvedPublicNavGroup } from "@/lib/navigation/build-public-nav";

export type SitemapLink = {
  href: string;
  label: string;
  external?: boolean;
};

export type SitemapSection = {
  id: string;
  title: string;
  links: SitemapLink[];
};

/** SEO 랜딩 — 사이트맵 하단 "기타 검색" */
const SEO_SEARCH_LINKS: {
  href: string;
  labelKo: string;
  labelEn: string;
}[] = [
  { href: "/media", labelKo: "매체 유형별", labelEn: "Browse by media type" },
  { href: "/target/brand", labelKo: "브랜드 캠페인", labelEn: "Brand campaigns" },
  {
    href: "/target/small_business",
    labelKo: "로컬·소상공인",
    labelEn: "Local & small business",
  },
  {
    href: "/target/university",
    labelKo: "대학교 캠페인",
    labelEn: "University campaigns",
  },
  { href: "/target/public", labelKo: "지자체 광고", labelEn: "Public sector ads" },
  { href: "/target/fandom", labelKo: "팬덤 광고", labelEn: "Fandom ads" },
  { href: "/media/category/bus", labelKo: "버스 광고", labelEn: "Bus advertising" },
  {
    href: "/media/category/subway",
    labelKo: "지하철 광고",
    labelEn: "Subway advertising",
  },
  {
    href: "/media/category/billboard",
    labelKo: "전광판 광고",
    labelEn: "Billboard advertising",
  },
];

type BuildSitemapSectionsInput = {
  locale: string;
  discovery: ResolvedPublicNavGroup;
  planning: ResolvedPublicNavGroup;
  studio: ResolvedPublicNavGroup;
  insights: ResolvedPublicNavGroup;
  industryGuideLabel: string;
  companyTitle: string;
  otherSearchTitle: string;
  servicesLabel: string;
  mediaRegisterLabel: string;
  contactLabel: string;
};

function groupLinks(group: ResolvedPublicNavGroup): SitemapLink[] {
  return group.items.map((item) => ({
    href: item.href,
    label: item.label,
  }));
}

function seoSearchLinks(locale: string): SitemapLink[] {
  const isKo = locale.startsWith("ko");
  return SEO_SEARCH_LINKS.map((link) => ({
    href: link.href,
    label: isKo ? link.labelKo : link.labelEn,
  }));
}

/** 사이트맵 모달 — PUBLIC_NAV_GROUPS 와 동기화 */
export function buildSitemapSections(
  input: BuildSitemapSectionsInput,
): SitemapSection[] {
  const {
    locale,
    discovery,
    planning,
    studio,
    insights,
    industryGuideLabel,
    companyTitle,
    otherSearchTitle,
    servicesLabel,
    mediaRegisterLabel,
    contactLabel,
  } = input;

  return [
    {
      id: "discovery",
      title: discovery.label,
      links: groupLinks(discovery),
    },
    {
      id: "planning",
      title: planning.label,
      links: groupLinks(planning),
    },
    {
      id: "insights",
      title: insights.label,
      links: [
        ...groupLinks(insights),
        { href: "/industry/beauty", label: industryGuideLabel },
      ],
    },
    {
      id: "studio",
      title: studio.label,
      links: groupLinks(studio),
    },
    {
      id: "company",
      title: companyTitle,
      links: [
        { href: "/services", label: servicesLabel },
        { href: "/register/media", label: mediaRegisterLabel },
        { href: "/contact", label: contactLabel },
      ],
    },
    {
      id: "other-search",
      title: otherSearchTitle,
      links: seoSearchLinks(locale),
    },
  ];
}

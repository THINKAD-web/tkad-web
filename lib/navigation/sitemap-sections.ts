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

type BuildSitemapSectionsInput = {
  discovery: ResolvedPublicNavGroup;
  planning: ResolvedPublicNavGroup;
  studio: ResolvedPublicNavGroup;
  insights: ResolvedPublicNavGroup;
  industryGuideLabel: string;
  webinarLabel: string;
  companyTitle: string;
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

/** 사이트맵 모달 — PUBLIC_NAV_GROUPS 와 동기화 */
export function buildSitemapSections(
  input: BuildSitemapSectionsInput,
): SitemapSection[] {
  const {
    discovery,
    planning,
    studio,
    insights,
    industryGuideLabel,
    webinarLabel,
    companyTitle,
    servicesLabel,
    mediaRegisterLabel,
    contactLabel,
  } = input;

  const mediaTypeLinks: SitemapLink[] = [
    { href: "/media/category/subway", label: "지하철 광고" },
    { href: "/media/category/bus", label: "버스 광고" },
    { href: "/media/category/billboard", label: "전광판 광고" },
    { href: "/media/category/campus", label: "대학가 광고" },
    { href: "/media/category/dooh", label: "DOOH 광고" },
    { href: "/media/category/local", label: "로컬 매체" },
  ];

  const targetLinks: SitemapLink[] = [
    { href: "/target/brand", label: "브랜드 캠페인" },
    { href: "/target/fandom", label: "팬덤 광고" },
    { href: "/target/public", label: "지자체 광고" },
    { href: "/target/small_business", label: "로컬·소상공인" },
    { href: "/target/university", label: "대학교 캠페인" },
  ];

  return [
    {
      id: "discovery",
      title: discovery.label,
      links: [
        ...groupLinks(discovery),
        { href: "/media/category/subway", label: "매체 유형별" },
      ],
    },
    {
      id: "planning",
      title: planning.label,
      links: [...groupLinks(planning), ...targetLinks],
    },
    {
      id: "studio",
      title: studio.label,
      links: groupLinks(studio),
    },
    {
      id: "insights",
      title: insights.label,
      links: [
        ...groupLinks(insights),
        { href: "/industry/beauty", label: industryGuideLabel },
        { href: "/academy#academy-webinars", label: webinarLabel },
      ],
    },
    {
      id: "company",
      title: companyTitle,
      links: [
        { href: "/services", label: servicesLabel },
        { href: "/register/media", label: mediaRegisterLabel },
        { href: "/contact", label: contactLabel },
        ...mediaTypeLinks.slice(0, 3),
      ],
    },
  ];
}

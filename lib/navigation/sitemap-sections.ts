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
  creative: ResolvedPublicNavGroup;
  insights: ResolvedPublicNavGroup;
  academy: ResolvedPublicNavGroup;
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

/** 사이트맵 모달 6섹션 그리드 — PUBLIC_NAV_GROUPS 와 동기화 */
export function buildSitemapSections(
  input: BuildSitemapSectionsInput,
): SitemapSection[] {
  const {
    discovery,
    planning,
    creative,
    insights,
    academy,
    industryGuideLabel,
    webinarLabel,
    companyTitle,
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
      id: "creative",
      title: creative.label,
      links: groupLinks(creative),
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
      id: "academy",
      title: academy.label,
      links: [
        ...groupLinks(academy),
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
      ],
    },
  ];
}

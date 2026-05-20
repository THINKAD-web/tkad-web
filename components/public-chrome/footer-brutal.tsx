"use client";

/**
 * FooterBrutal — 공개 네비 IA(`PUBLIC_NAV_GROUPS`)와 동기화된 4컬럼 푸터.
 * 브랜드 | 발견·기획 | 크리에이티브·인사이트 | 연락처
 */

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { BrutalFooter, type BrutalFooterColumn } from "@/components/brutalist";
import { KAKAO_CHANNEL_PUBLIC_URL } from "@/lib/kakao-public";
import { CONTACT_EMAIL } from "@/lib/constants";
import {
  buildPublicNavGroups,
  type ResolvedPublicNavGroup,
  type ResolvedPublicNavItem,
} from "@/lib/navigation/build-public-nav";
import type { PublicNavGroupId } from "@/lib/navigation/public-nav-data";
import { INDUSTRY_SLUGS } from "@/lib/industry-landing";

const INSTAGRAM_URL = "https://www.instagram.com/thinkad_korea" as const;

function footerItemLabel(item: ResolvedPublicNavItem): string {
  return item.badge ? `${item.label} · ${item.badge}` : item.label;
}

function mergeNavGroups(
  groups: ResolvedPublicNavGroup[],
  title: string,
  extraItems: BrutalFooterColumn["items"] = [],
): BrutalFooterColumn {
  return {
    title,
    items: [
      ...groups.flatMap((g) =>
        g.items.map((item) => ({
          href: item.href,
          label: footerItemLabel(item),
        })),
      ),
      ...extraItems,
    ],
  };
}

function pickGroup(
  groups: ResolvedPublicNavGroup[],
  id: PublicNavGroupId,
): ResolvedPublicNavGroup {
  const g = groups.find((x) => x.id === id);
  if (!g) throw new Error(`Missing nav group: ${id}`);
  return g;
}

export function FooterBrutal() {
  const t = useTranslations();
  const navGroups = useMemo(() => buildPublicNavGroups(t), [t]);

  const columns = useMemo((): BrutalFooterColumn[] => {
    const discovery = pickGroup(navGroups, "discovery");
    const planning = pickGroup(navGroups, "planning");
    const creative = pickGroup(navGroups, "creative");
    const insights = pickGroup(navGroups, "insights");
    const academy = pickGroup(navGroups, "academy");

    const industryGuide: BrutalFooterColumn = {
      title: t("footer.industryGuide"),
      items: INDUSTRY_SLUGS.map((slug) => ({
        href: `/industry/${slug}`,
        label: t(`industryPage.common.industryLabels.${slug}`),
      })),
    };

    return [
      mergeNavGroups([discovery, planning], t("footer.discoveryPlanning")),
      industryGuide,
      mergeNavGroups([creative, insights, academy], t("footer.creativeInsights"), [
        { href: "/register/media", label: t("footer.mediaPartnerRegister") },
        { href: "/privacy", label: t("footer.privacy") },
      ]),
    ];
  }, [navGroups, t]);

  const contactInfo: BrutalFooterColumn = {
    title: t("footer.contactInfo"),
    items: [
      { label: t("footer.address") },
      { label: t("footer.phone") },
      { label: CONTACT_EMAIL },
      {
        href: KAKAO_CHANNEL_PUBLIC_URL,
        label: t("footer.kakaoChannel"),
        external: true,
      },
      {
        href: INSTAGRAM_URL,
        label: "Instagram · @thinkad_korea",
        external: true,
      },
    ],
  };

  return (
    <BrutalFooter
      description={t("footer.description")}
      brandMeta={
        <>
          <p>{t("footer.companyName")}</p>
          <p>{t("footer.bizNumber")}</p>
        </>
      }
      columns={[...columns, contactInfo]}
      copyright={t("footer.copyright", { year: new Date().getFullYear() })}
    />
  );
}

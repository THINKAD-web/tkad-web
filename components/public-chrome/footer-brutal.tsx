"use client";

/**
 * FooterBrutal — b930b10 IA 의 4컬럼(브랜드 / Quick Links / Contact / Services)
 * 구조를 BrutalFooter 로 렌더하는 래퍼.
 *
 * 컬럼 매핑은 components/footer.tsx (b930b10) 와 1:1 동일.
 * Phase 3 의 다른 페이지들이 모두 마이그레이션되어도 IA 그대로.
 */

import { useTranslations } from "next-intl";
import { BrutalFooter, type BrutalFooterColumn } from "@/components/brutalist";
import { KAKAO_CHANNEL_PUBLIC_URL } from "@/lib/kakao-public";

export function FooterBrutal() {
  const t = useTranslations();

  const quickLinks: BrutalFooterColumn = {
    title: t("footer.quickLinks"),
    items: [
      { href: "/services", label: t("nav.services") },
      { href: "/media", label: t("footer.linkFeaturedMedia") },
      { href: "/cases", label: t("nav.cases") },
      { href: "/contact", label: t("nav.contact") },
      { href: "/privacy", label: t("footer.privacy") },
    ],
  };

  const contactInfo: BrutalFooterColumn = {
    title: t("footer.contactInfo"),
    items: [
      { label: t("footer.address") },
      { label: t("footer.phone") },
      { label: t("footer.email") },
      {
        href: KAKAO_CHANNEL_PUBLIC_URL,
        label: t("footer.kakaoChannel"),
        external: true,
      },
    ],
  };

  const services: BrutalFooterColumn = {
    title: t("footer.services"),
    items: [
      { href: "/media", label: t("footer.domesticOOH") },
      { href: "/planner", label: t("footer.crossBorderOOH") },
      { href: "/contact", label: t("footer.dataConsulting") },
      { href: "/tools", label: t("footer.planningTool") },
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
      columns={[quickLinks, contactInfo, services]}
      copyright={t("footer.copyright")}
      legal={`${t("footer.companyName")} · ${t("footer.bizNumber")}`}
    />
  );
}

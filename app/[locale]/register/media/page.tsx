import { setRequestLocale } from "next-intl/server";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import type { Metadata } from "next";
import { pageAlternates } from "@/lib/seo";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { MediaRegisterNeonClient } from "./media-register-neon-client";
import { MediaOwnerRevenueCalculator } from "@/components/media-owner/media-owner-revenue-calculator";
import { NeonSection } from "@/components/landing/neon/neon-section";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import {
  CategoryExploreHero,
  CategoryHeroCtaRow,
  categoryHeroCtaPrimaryClass,
  categoryHeroCtaSecondaryClass,
} from "@/components/category-explore-hero";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  return {
    title: isKo
      ? "매체 등록 신청 | THINKAD"
      : "Register your media | THINKAD",
    description: isKo
      ? "매체사 셀프 등록 신청 — 싱커드 심사 후 카탈로그에 노출됩니다."
      : "Submit your OOH media for THINKAD review and catalog listing.",
    alternates: pageAlternates(locale, "/register/media"),
    robots: { index: true, follow: true },
  };
}

export default async function MediaRegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const isKo = locale === "ko";

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon bg-gray-50 dark:bg-[#0A0A0A]">
        <CategoryExploreHero
          code="// 07 · MEDIA PARTNER"
          headlineBefore={isKo ? "매체 " : "Register "}
          headlineGradient={isKo ? "등록 신청" : "your OOH media"}
          subtitle={
            isKo
              ? "신규 매체가 있으신가요? 싱커드 검증 후 THINKAD 카탈로그에 노출됩니다."
              : "List new inventory with THINKAD — verified media for advertisers nationwide."
          }
        >
          <CategoryHeroCtaRow>
            <a href="#register-form" className={categoryHeroCtaPrimaryClass}>
              {isKo ? "신청서 작성" : "Start application"}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
            <Link href="/contact" className={categoryHeroCtaSecondaryClass}>
              {isKo ? "문의하기" : "Contact us"}
              <ArrowRight className="h-4 w-4 dark:text-white text-gray-700" aria-hidden />
            </Link>
          </CategoryHeroCtaRow>
        </CategoryExploreHero>

        <NeonSection className="pb-4 pt-0">
          <MediaOwnerRevenueCalculator
            locale={locale}
            variant="landing"
            registerAnchor="#register-form"
          />
        </NeonSection>

        <div id="register-form">
          <MediaRegisterNeonClient />
        </div>
      </div>
    </HomeLandingDayNight>
  );
}

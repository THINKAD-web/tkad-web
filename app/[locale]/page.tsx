import { resolveLocaleParam } from "@/lib/resolve-locale";
import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { pageAlternates } from "@/lib/seo";

import { HomeAppearanceShell } from "@/components/home/home-appearance-shell";
import { HomeHeroBanner } from "@/components/home/home-hero-banner";
import { HomeQuickAccess } from "@/components/home/home-quick-access";
import { HomeMediaScroll } from "@/components/home/home-media-scroll";
import { HomePlannerAccess } from "@/components/home/home-planner-access";
import {
  HomeSuccessCasesFeed,
  HomeTrendReportsFeed,
} from "@/components/home/home-content-feed";
import { HomeMoreLinks } from "@/components/home/home-more-links";
import { HomeTrustBar } from "@/components/home/home-trust-bar";

/** 홈 — ISR 60초 */
export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  const title = isKo
    ? "THINKAD — 검증 OOH 매체 마켓플레이스"
    : "THINKAD — Verified OOH media marketplace";
  const description = isKo
    ? "500+ 검증 매체. AI 추천·인기·신규 매체 피드와 빠른 캠페인 기획."
    : "500+ verified media. AI picks, popular & new listings — plan campaigns fast.";
  return {
    title: { absolute: title },
    description,
    alternates: pageAlternates(locale, ""),
    openGraph: { title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);

  const isKo = locale.startsWith("ko");

  return (
    <HomeAppearanceShell>
      <main className="pb-20 dark:bg-[#020202] bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
          <HomeHeroBanner locale={locale} />
          <HomeQuickAccess locale={locale} />
          <HomeMediaScroll
            locale={locale}
            title={isKo ? "싱커드 추천 매체" : "THINKAD picks"}
            subtitle={
              isKo ? "AI가 선별한 이번 주 추천" : "AI-curated picks this week"
            }
            viewAllHref="/media?sort=recommended"
            fetchType="recommended"
            limit={10}
          />
          <HomeMediaScroll
            locale={locale}
            title={isKo ? "이번 주 인기 매체" : "Popular this week"}
            subtitle={isKo ? "가장 많이 문의된 매체" : "Most inquired media"}
            viewAllHref="/media?sort=popular"
            fetchType="popular"
            limit={10}
          />
          <HomeMediaScroll
            locale={locale}
            title={isKo ? "새로 등록된 매체" : "Newly listed"}
            subtitle={isKo ? "이번 주 새로 등록" : "Fresh listings this week"}
            viewAllHref="/media?sort=newest"
            fetchType="newest"
            limit={10}
          />
          <HomePlannerAccess locale={locale} />
          <HomeTrendReportsFeed locale={locale} />
          <HomeSuccessCasesFeed locale={locale} />
          <HomeMoreLinks locale={locale} />
          <HomeTrustBar locale={locale} />
        </div>
      </main>
    </HomeAppearanceShell>
  );
}

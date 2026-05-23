import { resolveLocaleParam } from "@/lib/resolve-locale";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { pageAlternates } from "@/lib/seo";
import { type MediaItem } from "@/lib/media-data";
import {
  fetchHomeHeroVisualAssets,
  fetchHomeWeeklyPopularMedia,
} from "@/lib/public-media-catalog";
import { attachRecommendReason } from "@/lib/media-recommend-reasons";
import { mergeMediaTrustFromCatalog } from "@/lib/media-trust-catalog";
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";

import { HomeHeroServer } from "@/components/home/home-hero-server";
import { HomeMediaHorizontalScroll } from "@/components/home/home-media-horizontal-scroll";
import { HomeAppearanceShell } from "@/components/home/home-appearance-shell";
import { HomeLaunchBanner } from "@/components/home/home-launch-banner";
import {
  HomeCategorySection,
  HomePopularMediaHeader,
  HomeQuickEntry,
  HomeTrustStrip,
} from "@/components/home/home-simple-sections";

/** 홈 — ISR 60초 (히어로·매체 그리드·통계 크롤러 노출) */
export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  const title = isKo
    ? "THINKAD 싱커드 — 한국 OOH 광고 플랫폼"
    : "THINKAD Syncad — Korea OOH advertising platform";
  const description = isKo
    ? "500+ 검증 매체. AI 플래너로 3분 견적, 전국 옥외광고 매체 검색·비교·상담까지 한 곳에서."
    : "500+ verified media. Get a 3-minute estimate with AI Planner — search, compare, and consult OOH nationwide.";
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

  const [weeklyPopularCatalog, heroVisuals, fullCatalog] = await Promise.all([
    fetchHomeWeeklyPopularMedia(),
    fetchHomeHeroVisualAssets(),
    fetchPublicMediaCatalog(),
  ]);

  const weeklyPopularWithTrust = mergeMediaTrustFromCatalog(
    weeklyPopularCatalog,
    fullCatalog,
  );

  const weeklyPopularItems = attachRecommendReason(
    weeklyPopularWithTrust,
    "weekly_popular",
    locale,
  );

  return (
    <HomeContent
      locale={locale}
      weeklyPopularItems={weeklyPopularItems}
      heroVisuals={heroVisuals}
    />
  );
}

function HomeContent({
  locale,
  weeklyPopularItems,
  heroVisuals,
}: {
  locale: string;
  weeklyPopularItems: MediaItem[];
  heroVisuals: Awaited<ReturnType<typeof fetchHomeHeroVisualAssets>>;
}) {
  const popularItems = weeklyPopularItems.slice(0, 6);

  return (
    <HomeAppearanceShell>
      <HomeLaunchBanner />

      {/* 섹션 1 — 히어로 */}
      <HomeHeroServer locale={locale} mapPins={heroVisuals.mapPins} />

      {/* 섹션 2 — 빠른 진입 */}
      <HomeQuickEntry locale={locale} />

      {/* 섹션 3 — 카테고리 */}
      <HomeCategorySection locale={locale} />

      {/* 섹션 4 — 인기 매체 */}
      {popularItems.length > 0 ? (
        <section className="pb-10 pt-4">
          <HomePopularMediaHeader locale={locale} />
          <div className="mt-4">
            <HomeMediaHorizontalScroll
              items={popularItems}
              locale={locale}
              rows={1}
              density="compact"
            />
          </div>
        </section>
      ) : null}

      {/* 섹션 5 — 신뢰 지표 */}
      <HomeTrustStrip locale={locale} />
    </HomeAppearanceShell>
  );
}

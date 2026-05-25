import { resolveLocaleParam } from "@/lib/resolve-locale";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { pageAlternates } from "@/lib/seo";
import {
  fetchHomeNewMedia,
  fetchHomeWeeklyPopularMedia,
  fetchPublicMediaCatalog,
} from "@/lib/public-media-catalog";
import { attachRecommendReason } from "@/lib/media-recommend-reasons";
import { mergeMediaTrustFromCatalog } from "@/lib/media-trust-catalog";

import { HomeAppearanceShell } from "@/components/home/home-appearance-shell";
import { HomeHeroBannerSlider } from "@/components/home/home-hero-banner-slider";
import {
  HomeCategorySection,
  HomeTrustStrip,
} from "@/components/home/home-simple-sections";
import { HomeMediaHorizontalSection } from "@/components/home/home-media-horizontal-scroll";
import { HomeHubNavigationSection } from "@/components/home/home-hub-navigation";

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
    ? "500+ 검증 매체. 지역·유형별 큐레이션, 평점·집행 이력 기반 신뢰 마켓플레이스."
    : "500+ verified media. Curated by region and type — trust scores, ratings, and execution history.";
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

  const t = await getTranslations({ locale, namespace: "media" });

  const [weeklyPopularCatalog, newMediaCatalog, fullCatalog] = await Promise.all([
    fetchHomeWeeklyPopularMedia(10),
    fetchHomeNewMedia(10),
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

  const popularItems = weeklyPopularItems.slice(0, 10);

  const newMediaWithTrust = mergeMediaTrustFromCatalog(
    newMediaCatalog,
    fullCatalog,
  );
  const newItems = newMediaWithTrust.slice(0, 10);

  const isKo = locale.startsWith("ko");

  return (
    <HomeAppearanceShell>
      {/* 1. 히어로 배너 슬라이더 */}
      <HomeHeroBannerSlider locale={locale} />

      {/* 2. 매체 유형 + 캠페인 목적 */}
      <HomeCategorySection locale={locale} />

      {/* 3. 이번 주 인기 매체 (가로 스크롤) */}
      <HomeMediaHorizontalSection
        title={isKo ? "이번 주 인기 매체" : "Popular this week"}
        viewAllLabel={isKo ? "전체 보기" : "View all"}
        viewAllHref="/media?sort=popular"
        items={popularItems}
        locale={locale}
        imagePreparingLabel={t("imagePreparing")}
      />

      {/* 4. 새로 등록된 매체 (가로 스크롤) */}
      <HomeMediaHorizontalSection
        title={isKo ? "새로 등록된 매체" : "Newly listed"}
        viewAllLabel={isKo ? "전체 보기" : "View all"}
        viewAllHref="/media?sort=newest"
        items={newItems}
        locale={locale}
        imagePreparingLabel={t("imagePreparing")}
        badge="new"
      />

      {/* 5. 허브 네비게이션 */}
      <HomeHubNavigationSection locale={locale} />

      {/* 6. 신뢰 지표 + 파트너 */}
      <HomeTrustStrip locale={locale} />
    </HomeAppearanceShell>
  );
}

import { resolveLocaleParam } from "@/lib/resolve-locale";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { pageAlternates } from "@/lib/seo";
import { type MediaItem } from "@/lib/media-data";
import { fetchHomeWeeklyPopularMedia } from "@/lib/public-media-catalog";
import { attachRecommendReason } from "@/lib/media-recommend-reasons";
import { mergeMediaTrustFromCatalog } from "@/lib/media-trust-catalog";
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";

import { HomeSearchHero } from "@/components/home/home-search-hero";
import { HomeAppearanceShell } from "@/components/home/home-appearance-shell";
import { HomeLaunchBanner } from "@/components/home/home-launch-banner";
import {
  HomeCategorySection,
  HomePopularMediaHeader,
  HomePopularMediaList,
  HomeTrustStrip,
} from "@/components/home/home-simple-sections";

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

  const [weeklyPopularCatalog, fullCatalog] = await Promise.all([
    fetchHomeWeeklyPopularMedia(),
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

  const popularItems = weeklyPopularItems.slice(0, 6);

  return (
    <HomeAppearanceShell>
      <HomeLaunchBanner />

      {/* 섹션 1 — 검색 히어로 */}
      <HomeSearchHero locale={locale} />

      {/* 섹션 2 — 카테고리 아이콘 그리드 */}
      <HomeCategorySection locale={locale} />

      {/* 섹션 3 — 이번 주 인기 매체 (리스트형) */}
      {popularItems.length > 0 ? (
        <section className="pb-8 pt-2">
          <HomePopularMediaHeader locale={locale} />
          <HomePopularMediaList
            items={popularItems}
            locale={locale}
            imagePreparingLabel={t("imagePreparing")}
          />
        </section>
      ) : null}

      {/* 섹션 4 — 신뢰 지표 */}
      <HomeTrustStrip locale={locale} />
    </HomeAppearanceShell>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { buildShareMetadata, pageAlternates } from "@/lib/seo";
import {
  COMMUNITY_CATEGORY_LABELS,
  normalizeCommunityCategory,
} from "@/lib/community/types";
import { CommunityFeedPage } from "@/components/community/feed-page";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";

type Props = {
  params: Promise<{ locale: string; category: string }>;
  searchParams: Promise<{ sort?: string; page?: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale, category: rawCategory } = await params;
  const locale = await resolveLocaleParam(Promise.resolve({ locale: rawLocale }));
  const category = normalizeCommunityCategory(rawCategory);
  if (!category) return { title: locale === "ko" ? "카테고리 없음" : "Not found" };
  const label = COMMUNITY_CATEGORY_LABELS[category];
  const isKo = locale === "ko";
  const title = isKo ? `${label.ko} 커뮤니티` : `${label.en} Community`;
  const description = isKo ? label.description.ko : label.description.en;
  return {
    title,
    description,
    alternates: pageAlternates(locale, `/community/${category}`),
    ...buildShareMetadata({
      locale,
      title,
      description,
      path: `/community/${category}`,
    }),
  };
}

export default async function CommunityCategoryPage({
  params,
  searchParams,
}: Props) {
  const { locale: rawLocale, category: rawCategory } = await params;
  const locale = await resolveLocaleParam(Promise.resolve({ locale: rawLocale }));
  setRequestLocale(locale);
  const category = normalizeCommunityCategory(rawCategory);
  if (!category) notFound();
  const sp = await searchParams;
  const activePage = Math.max(1, Number(sp.page ?? "1") || 1);
  const activeSort =
    sp.sort === "new" || sp.sort === "popular" ? sp.sort : "mixed";

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-planner-neon">
        <CommunityFeedPage
          locale={locale}
          activeCategory={category}
          activeSort={activeSort}
          activePage={activePage}
        />
      </div>
    </HomeLandingDayNight>
  );
}

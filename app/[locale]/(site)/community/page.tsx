import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { buildShareMetadata, pageAlternates } from "@/lib/seo";
import { CommunityFeedPage } from "@/components/community/feed-page";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ sort?: string; page?: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  const title = isKo ? "OOH 업계 커뮤니티" : "OOH Industry Community";
  const description = isKo
    ? "광고주, 매체사, 대행사, 프리랜서가 함께 질문과 인사이트를 나누는 회원 중심 커뮤니티."
    : "A members-first community for advertisers, media operators, agencies, and freelancers.";
  return {
    title,
    description,
    alternates: pageAlternates(locale, "/community"),
    ...buildShareMetadata({
      locale,
      title,
      description,
      path: "/community",
    }),
    robots: { index: true, follow: true },
  };
}

export default async function CommunityListPage({ params, searchParams }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const sp = await searchParams;
  const activePage = Math.max(1, Number(sp.page ?? "1") || 1);
  const activeSort =
    sp.sort === "new" || sp.sort === "popular" ? sp.sort : "mixed";

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-planner-neon">
        <CommunityFeedPage
          locale={locale}
          activeSort={activeSort}
          activePage={activePage}
        />
      </div>
    </HomeLandingDayNight>
  );
}

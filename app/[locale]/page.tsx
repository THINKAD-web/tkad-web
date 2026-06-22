import type { Metadata } from "next";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { buildShareMetadata, pageAlternates } from "@/lib/seo";
import { HomeHeroBanner } from "@/components/home/home-hero-banner";
import { HomeQuickAccess } from "@/components/home/home-quick-access";
import { HomeMediaScroll } from "@/components/home/home-media-scroll";
import { HomeContentFeed } from "@/components/home/home-content-feed";
import { HomeMoreLinks } from "@/components/home/home-more-links";
import { fetchPublicMediaCatalog } from "@/lib/media-catalog";
import { fetchPublishedReports } from "@/lib/report-queries";
import { fetchPublishedCases } from "@/lib/case-queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  const title = isKo
    ? "전광판·지하철·버스 옥외광고 단가 비교 | 전국 500+ 매체"
    : "Billboard, subway & bus OOH pricing | 500+ verified media";
  const description = isKo
    ? "실시간 월 단가·예상 노출로 전광판·지하철·버스·DOOH를 비교하고 즉시 견적. THINKAD 싱커드."
    : "Compare monthly rates and estimated reach for billboards, subway, bus, and DOOH — instant quotes on THINKAD.";
  return {
    title: { absolute: title },
    description,
    alternates: pageAlternates(locale, ""),
    ...buildShareMetadata({
      locale,
      title,
      description,
      path: "",
      image: { kind: "default" },
    }),
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isKo = locale === "ko" || locale.startsWith("ko");

  // 추천 → 인기(추천 제외) → 신규(추천+인기 제외) 순으로 중복 없이 구성.
  const recommendedMedia = await fetchPublicMediaCatalog({
    sort: "recommended",
    limit: 10,
  }).catch(() => []);
  const recIds = recommendedMedia.map((m) => m.id);

  const popularMedia = await fetchPublicMediaCatalog({
    sort: "popular",
    limit: 10,
    excludeIds: recIds,
  }).catch(() => []);
  const popIds = popularMedia.map((m) => m.id);

  const [newestMedia, reportItems, caseItems] = await Promise.all([
    fetchPublicMediaCatalog({
      sort: "newest",
      limit: 10,
      excludeIds: [...recIds, ...popIds],
    }).catch(() => []),
    fetchPublishedReports({ limit: 6 }).catch(() => []),
    fetchPublishedCases({ limit: 6 }).catch(() => []),
  ]);

  return (
    <main
      id="main-content"
      className="min-h-screen bg-gray-50 dark:bg-[#020202]"
    >
      <h1 className="sr-only">
        {isKo
          ? "전광판·지하철·버스 옥외광고 단가 비교 — 전국 500+ 매체"
          : "Billboard, subway & bus OOH pricing — compare 500+ verified media nationwide"}
      </h1>
      {/* 섹션 1: 히어로 배너 */}
      <HomeHeroBanner />

      {/* 섹션 2: 빠른 진입 아이콘 */}
      <HomeQuickAccess />

      {/* 섹션 3: 싱커드 추천 매체 */}
      <HomeMediaScroll
        title="싱커드 추천 매체"
        subtitle="AI가 선별한 이번 주 추천"
        viewAllHref="/ko/media?sort=recommended"
        media={recommendedMedia}
        locale={locale}
      />

      {/* 섹션 4: 인기 매체 */}
      <HomeMediaScroll
        title="이번 주 인기 매체"
        subtitle="가장 많이 문의된 매체"
        viewAllHref="/ko/media?sort=popular"
        media={popularMedia}
        locale={locale}
      />

      {/* 섹션 5: 새로 등록된 매체 */}
      <HomeMediaScroll
        title="새로 등록된 매체"
        subtitle="이번 주 새로 등록"
        viewAllHref="/ko/media?sort=newest"
        media={newestMedia}
        locale={locale}
      />

      {/* 섹션 6: 콘텐츠 피드 (트렌드 리포트 + 성공 사례) */}
      <HomeContentFeed reports={reportItems} cases={caseItems} />

      {/* 섹션 7: 정보·커뮤니티 */}
      <HomeMoreLinks />
    </main>
  );
}

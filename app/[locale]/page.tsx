import { HomeHeroBanner } from "@/components/home/home-hero-banner";
import { HomeQuickAccess } from "@/components/home/home-quick-access";
import { HomeMediaScroll } from "@/components/home/home-media-scroll";
import { HomeContentFeed } from "@/components/home/home-content-feed";
import { HomeMoreLinks } from "@/components/home/home-more-links";
import { fetchPublicMediaCatalog } from "@/lib/media-catalog";
import { fetchPublishedReports } from "@/lib/report-queries";
import { fetchPublishedCases } from "@/lib/case-queries";

export const revalidate = 60;

export default async function HomePage() {
  const [recommended, popular, newest, reports, cases] =
    await Promise.allSettled([
      fetchPublicMediaCatalog({ sort: "recommended", limit: 10 }),
      fetchPublicMediaCatalog({ sort: "popular", limit: 10 }),
      fetchPublicMediaCatalog({ sort: "newest", limit: 10 }),
      fetchPublishedReports({ limit: 6 }),
      fetchPublishedCases({ limit: 6 }),
    ]);

  const recommendedMedia =
    recommended.status === "fulfilled" ? recommended.value : [];
  const popularMedia = popular.status === "fulfilled" ? popular.value : [];
  const newestMedia = newest.status === "fulfilled" ? newest.value : [];
  const reportItems = reports.status === "fulfilled" ? reports.value : [];
  const caseItems = cases.status === "fulfilled" ? cases.value : [];

  return (
    <main
      id="main-content"
      className="min-h-screen bg-gray-50 dark:bg-[#020202]"
    >
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
      />

      {/* 섹션 4: 인기 매체 */}
      <HomeMediaScroll
        title="이번 주 인기 매체"
        subtitle="가장 많이 문의된 매체"
        viewAllHref="/ko/media?sort=popular"
        media={popularMedia}
      />

      {/* 섹션 5: 새로 등록된 매체 */}
      <HomeMediaScroll
        title="새로 등록된 매체"
        subtitle="이번 주 새로 등록"
        viewAllHref="/ko/media?sort=newest"
        media={newestMedia}
      />

      {/* 섹션 6: 콘텐츠 피드 (트렌드 리포트 + 성공 사례) */}
      <HomeContentFeed reports={reportItems} cases={caseItems} />

      {/* 섹션 7: 정보·커뮤니티 */}
      <HomeMoreLinks />
    </main>
  );
}

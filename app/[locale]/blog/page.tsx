"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Calendar, Filter, Search, Sparkles, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { BLOG_SEO_POSTS } from "@/lib/blog-seo-posts";
import {
  NeonPageShell,
  neonCardClass,
  neonSubtitleClass,
  neonTitleClass,
} from "@/components/marketing/neon-page-shell";

type BlogCategoryKey = "trend" | "case" | "news" | "guide";

type BlogPost = {
  id: number;
  slug: string;
  category: BlogCategoryKey;
  date: string;
  gradient: string;
  titleKo: string;
  titleEn: string;
  summaryKo: string;
  summaryEn: string;
  seoDetail?: boolean;
};

const posts: BlogPost[] = [
  {
    id: 1,
    slug: "2025-ooh-trend-report",
    category: "trend",
    date: "2025-01-15",
    gradient: "from-violet-600 to-cyan-500",
    titleKo: "2025 OOH 광고 트렌드 리포트",
    titleEn: "2025 OOH Advertising Trend Report",
    summaryKo:
      "디지털 사이니지, DOOH, 전국 통합 집행까지 2025년 주목해야 할 한국 OOH 광고 트렌드를 정리했습니다.",
    summaryEn:
      "From digital signage and DOOH to nationwide integrated executions, this report summarizes key Korean OOH trends for 2025.",
  },
  {
    id: 2,
    slug: "gangnam-landmark-case-study",
    category: "case",
    date: "2024-11-03",
    gradient: "from-purple-700 to-violet-900",
    titleKo: "강남 랜드마크 빌보드 캠페인 사례",
    titleEn: "Gangnam Landmark Billboard Campaign",
    summaryKo:
      "코엑스 K-POP 스퀘어와 강남대로 미디어폴을 활용한 브랜드 인지도 300% 상승 캠페인을 소개합니다.",
    summaryEn:
      "A case study on a campaign that achieved 300% brand awareness uplift using COEX K-POP Square and Gangnam-daero Media Pole.",
  },
  {
    id: 3,
    slug: "coex-landmark-launch",
    category: "case",
    date: "2024-07-20",
    gradient: "from-indigo-600 to-purple-800",
    titleKo: "코엑스 랜드마크 런칭 캠페인",
    titleEn: "COEX Landmark Launch Campaign",
    summaryKo:
      "글로벌 뷰티 브랜드의 코엑스 랜드마크 OOH 런칭 캠페인 플래닝과 집행 인사이트를 공유합니다.",
    summaryEn:
      "Insights from planning and executing a global beauty brand launch campaign on landmark OOH media around COEX.",
  },
  {
    id: 4,
    slug: "thinkad-company-news-2025",
    category: "news",
    date: "2025-03-01",
    gradient: "from-gray-700 to-gray-900",
    titleKo: "THINKAD, AI 기반 OOH 플랫폼 공식 런칭",
    titleEn: "THINKAD Officially Launches AI-Powered OOH Platform",
    summaryKo:
      "데이터 기반 매체 추천과 캠페인 성과 예측을 제공하는 AI OOH 플랫폼 런칭 소식을 전합니다.",
    summaryEn:
      "Announcement of THINKAD's AI-powered OOH platform that delivers data-driven media recommendations and performance forecasts.",
  },
  {
    id: 5,
    slug: "ooh-media-checklist",
    category: "trend",
    date: "2024-04-10",
    gradient: "from-violet-500 to-fuchsia-600",
    titleKo: "OOH 매체 선정 체크리스트",
    titleEn: "OOH Media Selection Checklist",
    summaryKo:
      "예산, 타겟, 동선, 노출 환경까지 고려한 OOH 매체 선정 체크리스트를 정리했습니다.",
    summaryEn:
      "A practical checklist for selecting OOH media considering budget, target audience, routes, and exposure environment.",
  },
  ...BLOG_SEO_POSTS.map((p, i) => ({
    id: 100 + i,
    slug: p.slug,
    category: "guide" as const,
    date: p.publishedAt,
    gradient: "from-cyan-600 to-violet-600",
    titleKo: p.titleKo,
    titleEn: p.titleEn,
    summaryKo: p.descriptionKo,
    summaryEn: p.descriptionEn,
    seoDetail: true,
  })),
];

const categories: {
  key: BlogCategoryKey | "all";
  getLabel: (isKo: boolean) => string;
}[] = [
  { key: "all", getLabel: (isKo) => (isKo ? "전체" : "All") },
  { key: "trend", getLabel: (isKo) => (isKo ? "OOH 트렌드" : "OOH Trends") },
  { key: "case", getLabel: (isKo) => (isKo ? "성공사례" : "Case Studies") },
  { key: "news", getLabel: (isKo) => (isKo ? "회사소식" : "Company News") },
  { key: "guide", getLabel: (isKo) => (isKo ? "가이드" : "Guides") },
];

export default function BlogPage() {
  const locale = useLocale();
  const t = useTranslations();
  const isKo = locale === "ko";

  const [selectedCategory, setSelectedCategory] =
    useState<BlogCategoryKey | "all">("all");
  const [search, setSearch] = useState("");

  const filteredPosts = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return posts.filter((post) => {
      if (selectedCategory !== "all" && post.category !== selectedCategory) {
        return false;
      }
      if (!keyword) return true;
      const title = (isKo ? post.titleKo : post.titleEn).toLowerCase();
      const summary = (isKo ? post.summaryKo : post.summaryEn).toLowerCase();
      return title.includes(keyword) || summary.includes(keyword);
    });
  }, [isKo, search, selectedCategory]);

  return (
    <NeonPageShell>
      <section className="relative overflow-hidden bg-[#05050a] py-16 tkad-neon-depth tkad-neon-grid sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-medium uppercase tracking-widest text-violet-400">
            Blog
          </p>
          <h1 className={cn("mt-3", neonTitleClass, "text-white")}>
            {isKo ? "OOH 블로그 & 인사이트" : "OOH Blog & Insights"}
          </h1>
          <p className={cn("mt-4 max-w-2xl", neonSubtitleClass, "text-white/65")}>
            {isKo
              ? "OOH 트렌드, 성공사례, 회사소식을 한 곳에서 확인하세요."
              : "Explore OOH trends, case studies, and company news in one place."}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className={cn(neonCardClass, "p-4 sm:p-5")}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full max-w-md">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                aria-hidden
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  isKo
                    ? "키워드로 검색 (예: 코엑스, 타임스퀘어)"
                    : "Search by keyword (e.g., COEX, Times Square)"
                }
                className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-white/50">
                <Filter className="h-3.5 w-3.5" />
                {t("common.filter")}
              </span>
              {categories.map((cat) => {
                const isActive = selectedCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() =>
                      setSelectedCategory(cat.key as BlogCategoryKey | "all")
                    }
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                      isActive
                        ? "bg-violet-500 text-white"
                        : "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-white/70",
                    )}
                  >
                    {cat.getLabel(isKo)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-gray-500 dark:text-white/50">
          <Tag className="h-3.5 w-3.5 text-violet-500" aria-hidden />
          <span>
            {isKo ? "결과" : "Results"}:{" "}
            <span className="font-bold text-violet-500">{filteredPosts.length}</span>
          </span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPosts.map((post) => {
            const title = isKo ? post.titleKo : post.titleEn;
            const summary = isKo ? post.summaryKo : post.summaryEn;
            const categoryLabel = categories.find(
              (c) => c.key === post.category,
            )?.getLabel(isKo);

            const dateObj = new Date(post.date);
            const formattedDate = isKo
              ? `${dateObj.getFullYear()}년 ${dateObj.getMonth() + 1}월 ${dateObj.getDate()}일`
              : dateObj.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                });

            const card = (
              <article
                className={cn(
                  neonCardClass,
                  "group flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md",
                )}
              >
                <div
                  className={cn(
                    "relative h-36 bg-gradient-to-br",
                    post.gradient,
                  )}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="h-10 w-10 text-white/80" />
                  </div>
                  {categoryLabel ? (
                    <span className="absolute left-3 top-3 rounded-full bg-black/30 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
                      {categoryLabel}
                    </span>
                  ) : null}
                  <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-[11px] font-medium text-white/90">
                    <Calendar className="h-3.5 w-3.5" aria-hidden />
                    {formattedDate}
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white sm:text-base">
                    {title}
                  </h3>
                  <p className="mt-2 flex-1 text-xs leading-relaxed text-gray-500 dark:text-white/60 sm:text-sm">
                    {summary}
                  </p>
                  <span className="mt-4 text-xs font-semibold text-violet-500 group-hover:text-violet-400">
                    {isKo ? "Read more →" : "Read more →"}
                  </span>
                </div>
              </article>
            );

            if (post.seoDetail) {
              return (
                <Link key={post.id} href={`/blog/${post.slug}`} className="block h-full">
                  {card}
                </Link>
              );
            }

            return (
              <div key={post.id} className="h-full">
                {card}
              </div>
            );
          })}
        </div>

        {filteredPosts.length === 0 ? (
          <div className={cn(neonCardClass, "mt-10 p-8 text-center text-sm text-gray-500 dark:text-white/60")}>
            {isKo
              ? "검색 조건에 맞는 인사이트가 없습니다."
              : "No insights match your filters."}
          </div>
        ) : null}
      </section>
    </NeonPageShell>
  );
}

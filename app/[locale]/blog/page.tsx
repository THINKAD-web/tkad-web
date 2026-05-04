"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  ArrowLeft,
  Calendar,
  Filter,
  Search,
  Sparkles,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";

type BlogCategoryKey = "trend" | "case" | "news";

type BlogPost = {
  id: number;
  slug: string;
  category: BlogCategoryKey;
  date: string;
  thumbnailColor: string;
  titleKo: string;
  titleEn: string;
  summaryKo: string;
  summaryEn: string;
};

const posts: BlogPost[] = [
  {
    id: 1,
    slug: "2025-ooh-trend-report",
    category: "trend",
    date: "2025-01-15",
    thumbnailColor: "bg-accent",
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
    thumbnailColor: "bg-hero-void",
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
    thumbnailColor: "bg-hero-void",
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
    thumbnailColor: "bg-muted",
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
    thumbnailColor: "bg-accent",
    titleKo: "OOH 매체 선정 체크리스트",
    titleEn: "OOH Media Selection Checklist",
    summaryKo:
      "예산, 타겟, 동선, 노출 환경까지 고려한 OOH 매체 선정 체크리스트를 정리했습니다.",
    summaryEn:
      "A practical checklist for selecting OOH media considering budget, target audience, routes, and exposure environment.",
  },
];

const categories: {
  key: BlogCategoryKey | "all";
  getLabel: (isKo: boolean) => string;
}[] = [
  { key: "all", getLabel: (isKo) => (isKo ? "전체" : "All") },
  { key: "trend", getLabel: (isKo) => (isKo ? "OOH 트렌드" : "OOH Trends") },
  { key: "case", getLabel: (isKo) => (isKo ? "성공사례" : "Case Studies") },
  { key: "news", getLabel: (isKo) => (isKo ? "회사소식" : "Company News") },
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
    <>
      <section className="bg-hero-void py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">
                {`// 17 / Blog`}
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-hero-fg sm:text-5xl lg:text-6xl">
                {isKo ? "OOH 블로그 & 인사이트" : "OOH Blog & Insights"}
              </h1>
              <p className="mt-5 max-w-2xl font-mono text-[12px] tracking-tight text-hero-fg/75 sm:text-sm">
                {isKo
                  ? "OOH 트렌드, 성공사례, 회사소식을 한 곳에서 확인하세요."
                  : "Explore OOH trends, case studies, and company news in one place."}
              </p>
            </div>
            <div className="hidden sm:block">
              <Link
                href="/"
                className="inline-flex items-center gap-1 border-2 border-hero-fg bg-transparent px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-hero-fg transition-colors hover:bg-card hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {isKo ? "Home" : "Home"}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-muted py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Filters */}
          <div className="flex flex-col gap-4 border-2 border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative w-full max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={
                    isKo
                      ? "키워드로 검색 (예: 코엑스, 타임스퀘어)"
                      : "Search by keyword (e.g., COEX, Times Square)"
                  }
                  className="h-10 w-full border-2 border-border bg-card pl-9 pr-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-0">
              <span className="mr-2 flex items-center gap-1 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-accent">
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
                      "-mt-[2px] -ml-[2px] border-2 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] transition-colors",
                      isActive
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-border bg-card text-foreground hover:bg-muted",
                    )}
                  >
                    {cat.getLabel(isKo)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Result count */}
          <div className="mt-4 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            <div className="flex items-center gap-2">
              <Tag className="h-3.5 w-3.5 text-accent" />
              <span>
                {`// `}{isKo ? "Results" : "Results"}:{" "}
                <span className="font-bold text-accent">
                  {filteredPosts.length}
                </span>
              </span>
            </div>
          </div>

          {/* Posts */}
          <div className="mt-6 grid gap-0 md:grid-cols-2 lg:grid-cols-3">
            {filteredPosts.map((post) => {
              const title = isKo ? post.titleKo : post.titleEn;
              const summary = isKo ? post.summaryKo : post.summaryEn;
              const categoryLabel = categories.find(
                (c) => c.key === post.category,
              )?.getLabel(isKo);

              const dateObj = new Date(post.date);
              const formattedDate = isKo
                ? `${dateObj.getFullYear()}년 ${dateObj.getMonth() + 1}월 ${
                    dateObj.getDate()
                  }일`
                : dateObj.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  });

              return (
                <article
                  key={post.id}
                  className="group -mt-[2px] -ml-[2px] flex h-full flex-col overflow-hidden border-2 border-border bg-card"
                >
                  <div
                    className={cn(
                      "relative h-40 border-b-2 border-border",
                      post.thumbnailColor,
                    )}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className={cn("h-10 w-10", post.thumbnailColor === "bg-muted" ? "text-accent" : "text-hero-fg")} />
                    </div>
                    <div className="absolute left-3 top-3 flex items-center gap-2">
                      {categoryLabel && (
                        <span className="border-2 border-hero-fg bg-hero-void px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-hero-fg">
                          [ {categoryLabel} ]
                        </span>
                      )}
                    </div>
                    <div className="absolute bottom-3 left-3 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-hero-fg">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{formattedDate}</span>
                    </div>
                  </div>
                  <header className="border-b-2 border-border p-4">
                    <h3 className="text-sm font-bold tracking-tight text-foreground sm:text-base">
                      {title}
                    </h3>
                  </header>
                  <div className="flex flex-1 flex-col p-4">
                    <p className="font-mono text-[11px] leading-relaxed tracking-tight text-muted-foreground sm:text-[12px]">
                      {summary}
                    </p>
                    <div className="mt-4 flex items-center justify-between font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-accent group-hover:text-foreground">
                      <span>
                        {isKo ? "Read more →" : "Read more →"}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {filteredPosts.length === 0 && (
            <div className="mt-10 border-2 border-border bg-card px-6 py-10 text-center font-mono text-sm text-muted-foreground">
              {`// `}{isKo
                ? "검색 조건에 맞는 인사이트가 없습니다. 다른 키워드나 카테고리로 다시 시도해보세요."
                : "No insights match your filters. Try a different keyword or category."}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

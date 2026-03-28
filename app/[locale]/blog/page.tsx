"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Calendar,
  Filter,
  Search,
  Sparkles,
  Tag,
} from "lucide-react";

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
    thumbnailColor:
      "from-gold/20 via-gold/10 to-navy/20 bg-gradient-to-br border-gold/40",
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
    thumbnailColor:
      "from-navy/80 via-navy/60 to-navy/90 bg-gradient-to-br border-navy/40",
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
    thumbnailColor:
      "from-purple-500/70 via-indigo-500/70 to-navy/80 bg-gradient-to-br border-purple-400/50",
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
    thumbnailColor:
      "from-emerald-500/20 via-emerald-400/10 to-white bg-gradient-to-br border-emerald-300/60",
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
    thumbnailColor:
      "from-sky-500/30 via-sky-400/20 to-white bg-gradient-to-br border-sky-300/70",
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
  {
    key: "all",
    getLabel: (isKo) => (isKo ? "전체" : "All"),
  },
  {
    key: "trend",
    getLabel: (isKo) => (isKo ? "OOH 트렌드" : "OOH Trends"),
  },
  {
    key: "case",
    getLabel: (isKo) => (isKo ? "성공사례" : "Case Studies"),
  },
  {
    key: "news",
    getLabel: (isKo) => (isKo ? "회사소식" : "Company News"),
  },
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
      <section className="bg-navy py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold tracking-wider text-gold uppercase">
                {isKo ? "인사이트" : "Insights"}
              </p>
              <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
                {isKo ? "OOH 블로그 & 인사이트" : "OOH Blog & Insights"}
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-300">
                {isKo
                  ? "OOH 트렌드, 성공사례, 회사소식을 한 곳에서 확인하세요."
                  : "Explore OOH trends, case studies, and company news in one place."}
              </p>
            </div>
            <div className="hidden sm:block">
              <Link href="/">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full border-white/20 text-xs font-semibold text-slate-200 hover:bg-white/10"
                >
                  <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                  {isKo ? "메인으로 돌아가기" : "Back to Home"}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Filters */}
          <div className="flex flex-col gap-4 rounded-2xl border bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative w-full max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={
                    isKo
                      ? "키워드로 검색 (예: 코엑스, 타임스퀘어)"
                      : "Search by keyword (e.g., COEX, Times Square)"
                  }
                  className="h-10 rounded-full border-slate-200 pl-9 text-xs sm:text-sm"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                <Filter className="h-3.5 w-3.5" />
                {t("common.filter")}
              </span>
              {categories.map((cat) => {
                const isActive = selectedCategory === cat.key;
                return (
                  <Button
                    key={cat.key}
                    type="button"
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    className={`h-8 rounded-full border ${
                      isActive
                        ? "border-gold bg-gold text-navy hover:bg-gold-dark hover:text-navy"
                        : "border-slate-200 bg-white text-xs text-slate-700 hover:bg-slate-50"
                    }`}
                    onClick={() =>
                      setSelectedCategory(cat.key as BlogCategoryKey | "all")
                    }
                  >
                    {cat.getLabel(isKo)}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Result count */}
          <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <Tag className="h-3.5 w-3.5 text-gold" />
              <span>
                {isKo ? "검색 결과" : "Results"}:{" "}
                <span className="font-semibold text-navy">
                  {filteredPosts.length}
                </span>
              </span>
            </div>
          </div>

          {/* Posts */}
          <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
                <Card
                  key={post.id}
                  className="group flex h-full flex-col overflow-hidden border-0 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)] rounded-2xl"
                >
                  <div
                    className={`relative h-40 border-b ${post.thumbnailColor}`}
                  >
                    <div className="absolute inset-0 opacity-60" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="h-10 w-10 text-white/70 drop-shadow" />
                    </div>
                    <div className="absolute left-4 top-4 flex items-center gap-2">
                      {categoryLabel && (
                        <Badge className="bg-black/40 text-xs font-semibold text-white backdrop-blur">
                          {categoryLabel}
                        </Badge>
                      )}
                    </div>
                    <div className="absolute bottom-3 left-4 flex items-center gap-2 text-[11px] font-medium text-white/80">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{formattedDate}</span>
                    </div>
                  </div>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-navy sm:text-base">
                      {title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col">
                    <p className="text-xs leading-relaxed text-slate-600 sm:text-sm">
                      {summary}
                    </p>
                    <div className="mt-4 flex items-center justify-between text-[11px] font-semibold text-gold group-hover:text-gold-dark">
                      <span>
                        {isKo ? "자세히 보기 (준비 중)" : "Read more (coming soon)"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredPosts.length === 0 && (
            <div className="mt-10 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
              {isKo
                ? "검색 조건에 맞는 인사이트가 없습니다. 다른 키워드나 카테고리로 다시 시도해보세요."
                : "No insights match your filters. Try a different keyword or category."}
            </div>
          )}
        </div>
      </section>
    </>
  );
}


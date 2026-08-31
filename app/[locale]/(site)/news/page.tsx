"use client";

import { useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { Calendar, ExternalLink, Link as LinkIcon, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

type NewsCategory = "press" | "award" | "event" | "all";

type NewsItem = {
  id: number;
  date: string;
  titleKo: string;
  titleEn: string;
  summaryKo: string;
  summaryEn: string;
  category: Exclude<NewsCategory, "all">;
  link?: string;
  external?: boolean;
};

const categoryMeta: {
  key: NewsCategory;
  getLabel: (isKo: boolean) => string;
}[] = [
  { key: "all", getLabel: (isKo) => (isKo ? "전체" : "All") },
  { key: "press", getLabel: (isKo) => (isKo ? "보도자료" : "Press") },
  { key: "award", getLabel: (isKo) => (isKo ? "수상" : "Awards") },
  { key: "event", getLabel: (isKo) => (isKo ? "이벤트" : "Events") },
];

const NEWS_ITEMS: NewsItem[] = [
  {
    id: 1,
    date: "2025-03-12",
    category: "press",
    titleKo: "THINKAD, AI 기반 OOH 미디어 추천 엔진 공식 출시",
    titleEn: "THINKAD launches AI-powered OOH media recommendation engine",
    summaryKo:
      "캠페인 목적·타겟·예산을 기반으로 최적의 매체 조합을 제안하는 AI 추천 엔진을 런칭했습니다.",
    summaryEn:
      "Launched an AI engine that suggests optimal OOH media mix based on campaign goals, target audience and budget.",
    link: "https://news.example.com/thinkad-ai-ooh",
    external: true,
  },
  {
    id: 2,
    date: "2024-11-28",
    category: "award",
    titleKo: "2024 대한민국 OOH 어워즈 통합 캠페인 부문 수상",
    titleEn: "Winner of 2024 Korea OOH Awards Integrated Campaign category",
    summaryKo:
      "글로벌 뷰티 브랜드와 진행한 도심 랜드마크 통합 OOH 캠페인으로 통합 캠페인 부문 본상을 수상했습니다.",
    summaryEn:
      "Received the Integrated Campaign award for a landmark OOH campaign with a global beauty brand.",
  },
  {
    id: 3,
    date: "2024-09-05",
    category: "event",
    titleKo: "OOH & DOOH 인사이트 웨비나 개최",
    titleEn: "OOH & DOOH Insights Webinar",
    summaryKo:
      "마케터를 위한 옥외·디지털OOH 집행 전략과 실제 캠페인 사례를 공유하는 온라인 웨비나를 진행했습니다.",
    summaryEn:
      "Hosted an online webinar for marketers covering OOH/DOOH strategies and real-world case studies.",
    link: "https://events.example.com/thinkad-ooh-webinar",
    external: true,
  },
];

export default function NewsPage() {
  const locale = useLocale();
  const isKo = locale === "ko";

  const [selectedCategory, setSelectedCategory] =
    useState<NewsCategory>("all");

  const items = useMemo(() => {
    return NEWS_ITEMS.filter((item) =>
      selectedCategory === "all" ? true : item.category === selectedCategory,
    );
  }, [selectedCategory]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    if (isKo) {
      return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
    }
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <>
      <section className="bg-hero-void py-24">
        <div className="ui-container">
          <p className="tkad-type-label text-accent">
            {`// 15 / News`}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-hero-fg sm:text-5xl lg:text-6xl">
            {isKo
              ? "THINKAD 뉴스·보도자료"
              : "THINKAD News & Press Releases"}
          </h1>
          <p className="mt-5 max-w-2xl tkad-type-meta tracking-tight text-hero-fg/75 sm:text-sm">
            {isKo
              ? "회사 소식, 보도자료, 수상 소식과 이벤트 정보를 한눈에 확인하세요."
              : "Browse press releases, awards and event updates from THINKAD."}
          </p>
        </div>
      </section>

      <section className="bg-card py-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1 tkad-type-label text-accent">
            <Filter className="h-3.5 w-3.5" />
            [ {isKo ? "CATEGORY" : "CATEGORY"} ]
          </div>
          <div className="flex flex-wrap gap-0">
            {categoryMeta.map((cat) => {
              const isActive = selectedCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setSelectedCategory(cat.key)}
                  className={cn(
                    "-mt-[2px] -ml-[2px] border-2 px-3 py-1.5 tkad-type-label transition-colors",
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
          <div className="ml-auto tkad-type-label text-muted-foreground">
            {`// `}{isKo ? "TOTAL" : "TOTAL"}{" "}
            <span className="font-bold text-accent">{items.length}</span>
          </div>
        </div>
      </section>

      <section className="bg-muted py-10">
        <div className="ui-container">
          <div className="grid gap-0 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const title = isKo ? item.titleKo : item.titleEn;
              const summary = isKo ? item.summaryKo : item.summaryEn;
              const categoryLabel = categoryMeta.find(
                (c) => c.key === item.category,
              )?.getLabel(isKo);

              const TagIcon =
                item.category === "press"
                  ? ExternalLink
                  : item.category === "award"
                  ? LinkIcon
                  : Calendar;

              return (
                <article
                  key={item.id}
                  className="group -mt-[2px] -ml-[2px] flex h-full flex-col overflow-hidden border-2 border-border bg-card"
                >
                  <header className="border-b-2 border-border bg-hero-void p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5 tkad-type-label text-hero-fg/85">
                        <Calendar className="h-3.5 w-3.5 text-accent" />
                        <span>{formatDate(item.date)}</span>
                      </div>
                      {categoryLabel && (
                        <span className="border-2 border-accent bg-accent px-2 py-0.5 tkad-type-label text-accent-foreground">
                          [ {categoryLabel} ]
                        </span>
                      )}
                    </div>
                    <h3 className="mt-3 text-sm font-bold leading-snug tracking-tight text-hero-fg sm:text-base">
                      {title}
                    </h3>
                  </header>
                  <div className="flex flex-1 flex-col justify-between p-4">
                    <p className="tkad-type-caption leading-relaxed tracking-tight text-muted-foreground sm:tkad-type-meta">
                      {summary}
                    </p>
                    <div className="mt-4 flex items-center justify-between tkad-type-label text-accent group-hover:text-foreground">
                      {item.link ? (
                        <a
                          href={item.link}
                          target={item.external ? "_blank" : undefined}
                          rel={item.external ? "noopener noreferrer" : undefined}
                          className="inline-flex items-center gap-1.5"
                        >
                          <TagIcon className="h-3.5 w-3.5" />
                          <span>
                            {isKo
                              ? item.external
                                ? "자세히 보기 (외부)"
                                : "자세히 보기"
                              : item.external
                              ? "Read more (external)"
                              : "Read more"}
                          </span>
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                          <TagIcon className="h-3.5 w-3.5" />
                          <span>
                            {isKo
                              ? "자세히 보기 (준비 중)"
                              : "Details coming soon"}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {items.length === 0 && (
            <div className="mt-10 border-2 border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground">
              {isKo
                ? "선택하신 카테고리에 해당하는 소식이 없습니다. 다른 카테고리를 선택해 보세요."
                : "No news items for the selected category."}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

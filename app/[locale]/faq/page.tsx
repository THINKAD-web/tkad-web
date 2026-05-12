"use client";

import { useLocale } from "next-intl";
import { useMemo, useState } from "react";
import { Search, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { FAQ_ITEMS, type FaqCategory } from "@/lib/faq-data";

const CATEGORY_BADGE: Record<
  FaqCategory,
  { ko: string; en: string; className: string }
> = {
  ad: {
    ko: "광고문의",
    en: "Advertising",
    className: "border-accent bg-accent text-accent-foreground",
  },
  process: {
    ko: "진행절차",
    en: "Process",
    className: "border-border bg-hero-void text-hero-fg",
  },
  cost: {
    ko: "비용",
    en: "Cost",
    className: "border-border bg-card text-foreground",
  },
  other: {
    ko: "기타",
    en: "Other",
    className: "border-border bg-muted text-foreground",
  },
};

export default function FaqPage() {
  const locale = useLocale();
  const isKo = locale === "ko";
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});

  const categories = [
    { value: "all", label: isKo ? "전체" : "All" },
    { value: "ad", label: isKo ? "광고문의" : "Advertising Inquiry" },
    { value: "process", label: isKo ? "진행절차" : "Process" },
    { value: "cost", label: isKo ? "비용" : "Cost" },
    { value: "other", label: isKo ? "기타" : "Other" },
  ];

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return FAQ_ITEMS.filter((item) => {
      const catOk =
        activeCategory === "all" || item.category === activeCategory;
      if (!catOk) return false;
      if (!needle) return true;
      const q = isKo ? item.questionKo : item.questionEn;
      const a = isKo ? item.answerKo : item.answerEn;
      return `${q} ${a}`.toLowerCase().includes(needle);
    });
  }, [search, activeCategory, isKo]);

  const toggle = (id: string) => {
    setOpenIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <>
      <section className="bg-hero-void py-24">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">
            {`// 11 / FAQ`}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-hero-fg sm:text-5xl lg:text-6xl">
            {isKo ? "자주 묻는 질문" : "FAQ"}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl font-mono text-[12px] tracking-tight text-hero-fg/75 sm:text-sm">
            {isKo
              ? "THINKAD 서비스에 대해 자주 묻는 질문을 모았습니다."
              : "Answers to common questions about THINKAD services."}
          </p>
        </div>
      </section>

      <section className="bg-card py-10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                isKo ? "질문 또는 답변 검색…" : "Search questions or answers…"
              }
              className="h-11 w-full border-2 border-border bg-card pl-10 pr-4 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
              aria-label={isKo ? "FAQ 검색" : "Search FAQ"}
            />
          </div>
        </div>
      </section>

      <section className="bg-muted py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-0">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setActiveCategory(cat.value)}
                  className={cn(
                    "-mt-[2px] -ml-[2px] border-2 px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] transition-colors",
                    activeCategory === cat.value
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border bg-card text-foreground hover:bg-muted",
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {`// `}
              {isKo
                ? `${filtered.length}개의 결과`
                : `${filtered.length} results`}
            </p>
          </div>

          {filtered.length === 0 ? (
            <div className="border-2 border-border bg-card px-6 py-20 text-center">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
                [ NO RESULTS ]
              </p>
              <p className="mt-3 text-foreground">
                {isKo
                  ? "검색 조건에 맞는 질문이 없습니다. 다른 키워드나 카테고리를 시도해 보세요."
                  : "No questions match your search. Try a different keyword or category."}
              </p>
            </div>
          ) : (
            <ul className="space-y-0">
              {filtered.map((item) => {
                const open = !!openIds[item.id];
                const badge = CATEGORY_BADGE[item.category];
                return (
                  <li
                    key={item.id}
                    className="-mt-[2px] overflow-hidden border-2 border-border bg-card"
                  >
                    <button
                      type="button"
                      onClick={() => toggle(item.id)}
                      aria-expanded={open}
                      className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-muted md:gap-4 md:p-5"
                    >
                      {/* Q 마커 */}
                      <span
                        aria-hidden
                        className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center border-2 border-accent bg-accent font-mono text-[11px] font-bold tracking-wide text-accent-foreground"
                      >
                        Q
                      </span>
                      <span className="min-w-0 flex-1 space-y-2">
                        <span className={cn("inline-block border-2 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em]", badge.className)}>
                          [ {isKo ? badge.ko : badge.en} ]
                        </span>
                        <span className="block font-bold leading-snug tracking-tight text-foreground">
                          {isKo ? item.questionKo : item.questionEn}
                        </span>
                      </span>
                      <ChevronDown
                        className={cn(
                          "mt-1 h-5 w-5 shrink-0 text-accent transition-transform duration-300",
                          open && "rotate-180"
                        )}
                        aria-hidden
                      />
                    </button>
                    <div
                      className={cn(
                        "grid transition-[grid-template-rows] duration-300 ease-out",
                        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                      )}
                    >
                      <div className="min-h-0 overflow-hidden">
                        <div className="flex items-start gap-3 border-t-2 border-border bg-muted px-4 pb-5 pt-4 md:gap-4 md:px-5">
                          {/* A 마커 */}
                          <span
                            aria-hidden
                            className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center border-2 border-border bg-hero-void font-mono text-[11px] font-bold text-hero-fg"
                          >
                            A
                          </span>
                          <p className="min-w-0 flex-1 text-sm leading-relaxed text-foreground">
                            {isKo ? item.answerKo : item.answerEn}
                          </p>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}

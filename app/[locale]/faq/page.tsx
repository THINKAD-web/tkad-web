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
    className: "border-bx-accent bg-bx-accent text-bx-white",
  },
  process: {
    ko: "진행절차",
    en: "Process",
    className: "border-bx-black bg-bx-black text-bx-white",
  },
  cost: {
    ko: "비용",
    en: "Cost",
    className: "border-bx-black bg-bx-white text-bx-black",
  },
  other: {
    ko: "기타",
    en: "Other",
    className: "border-bx-black bg-bx-off text-bx-black",
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
      <section className="bg-bx-black py-24">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-bx-accent">
            {`// 11 / FAQ`}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-bx-white sm:text-5xl lg:text-6xl">
            {isKo ? "자주 묻는 질문" : "FAQ"}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl font-mono text-[12px] tracking-tight text-bx-white/75 sm:text-sm">
            {isKo
              ? "THINKAD 서비스에 대해 자주 묻는 질문을 모았습니다."
              : "Answers to common questions about THINKAD services."}
          </p>
        </div>
      </section>

      <section className="bg-bx-white py-10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bx-gray-dim"
              aria-hidden
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                isKo ? "질문 또는 답변 검색…" : "Search questions or answers…"
              }
              className="h-11 w-full border-2 border-bx-black bg-bx-white pl-10 pr-4 font-mono text-sm text-bx-black placeholder:text-bx-gray-dim focus:border-bx-accent focus:outline-none"
              aria-label={isKo ? "FAQ 검색" : "Search FAQ"}
            />
          </div>
        </div>
      </section>

      <section className="bg-bx-off py-16 sm:py-20">
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
                      ? "border-bx-accent bg-bx-accent text-bx-white"
                      : "border-bx-black bg-bx-white text-bx-black hover:bg-bx-off",
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-bx-gray-dim">
              {`// `}
              {isKo
                ? `${filtered.length}개의 결과`
                : `${filtered.length} results`}
            </p>
          </div>

          {filtered.length === 0 ? (
            <div className="border-2 border-bx-black bg-bx-white px-6 py-20 text-center">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                [ NO RESULTS ]
              </p>
              <p className="mt-3 text-bx-black">
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
                    className="-mt-[2px] overflow-hidden border-2 border-bx-black bg-bx-white"
                  >
                    <button
                      type="button"
                      onClick={() => toggle(item.id)}
                      aria-expanded={open}
                      className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-bx-off md:gap-4 md:p-5"
                    >
                      {/* Q 마커 */}
                      <span
                        aria-hidden
                        className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center border-2 border-bx-accent bg-bx-accent font-mono text-[11px] font-bold tracking-wide text-bx-white"
                      >
                        Q
                      </span>
                      <span className="min-w-0 flex-1 space-y-2">
                        <span className={cn("inline-block border-2 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em]", badge.className)}>
                          [ {isKo ? badge.ko : badge.en} ]
                        </span>
                        <span className="block font-bold leading-snug tracking-tight text-bx-black">
                          {isKo ? item.questionKo : item.questionEn}
                        </span>
                      </span>
                      <ChevronDown
                        className={cn(
                          "mt-1 h-5 w-5 shrink-0 text-bx-accent transition-transform duration-300",
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
                        <div className="flex items-start gap-3 border-t-2 border-bx-black bg-bx-off px-4 pb-5 pt-4 md:gap-4 md:px-5">
                          {/* A 마커 */}
                          <span
                            aria-hidden
                            className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center border-2 border-bx-black bg-bx-black font-mono text-[11px] font-bold text-bx-white"
                          >
                            A
                          </span>
                          <p className="min-w-0 flex-1 text-sm leading-relaxed text-bx-black">
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

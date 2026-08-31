"use client";

import { useMemo, useState } from "react";
import { Search, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FAQ_CATEGORY_META,
  FAQ_CATEGORY_ORDER,
  type FaqCategoryId,
} from "@/lib/seo-content/faq-catalog";
import type { PublicFaqItem } from "@/lib/public-faq";

type FaqTab = "all" | FaqCategoryId;

type Props = {
  items: PublicFaqItem[];
  isKo: boolean;
};

export function FaqPageClient({ items, isKo }: Props) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<FaqTab>("all");
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});

  const tabs: { value: FaqTab; label: string }[] = [
    { value: "all", label: isKo ? "전체" : "All" },
    ...FAQ_CATEGORY_ORDER.map((cat) => ({
      value: cat,
      label: isKo ? FAQ_CATEGORY_META[cat].labelKo : FAQ_CATEGORY_META[cat].labelEn,
    })),
  ];

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return items.filter((item) => {
      if (activeTab !== "all" && item.category !== activeTab) return false;
      if (!needle) return true;
      return `${item.question} ${item.answer}`.toLowerCase().includes(needle);
    });
  }, [search, activeTab, items]);

  const toggle = (id: string) => {
    setOpenIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <>
      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              isKo ? "질문 또는 답변 검색…" : "Search questions or answers…"
            }
            className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
            aria-label={isKo ? "FAQ 검색" : "Search FAQ"}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "rounded-full px-3.5 py-1.5 tkad-type-title transition-colors sm:text-sm",
                activeTab === tab.value
                  ? "tkad-qp-cta text-white"
                  : "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-white/70",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <p className="mt-4 text-xs text-gray-500 dark:text-white/50">
          {isKo
            ? `${filtered.length}개의 결과`
            : `${filtered.length} results`}
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-16 sm:px-6 lg:px-8">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center dark:border-white/10 dark:bg-white/5">
            <p className="text-gray-700 dark:text-white/80">
              {isKo
                ? "검색 조건에 맞는 질문이 없습니다."
                : "No questions match your search."}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((item) => {
              const open = !!openIds[item.id];
              const badge = FAQ_CATEGORY_META[item.category];
              return (
                <li
                  key={item.id}
                  className="overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-white/10 dark:bg-white/5"
                >
                  <button
                    type="button"
                    onClick={() => toggle(item.id)}
                    aria-expanded={open}
                    className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.03] md:gap-4 md:p-5"
                  >
                    <span
                      aria-hidden
                      className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[color:var(--qp-accent)] tkad-type-caption font-bold text-white"
                    >
                      Q
                    </span>
                    <span className="min-w-0 flex-1 space-y-2">
                      <span className="inline-block rounded-full bg-[color:var(--qp-accent)]/12 px-2.5 py-0.5 tkad-type-caption font-semibold text-[color:var(--qp-accent)]">
                        {isKo ? badge.labelKo : badge.labelEn}
                      </span>
                      <span className="block font-semibold leading-snug text-gray-900 dark:text-white">
                        {item.question}
                      </span>
                    </span>
                    <ChevronDown
                      className={cn(
                        "mt-1 h-5 w-5 shrink-0 text-[color:var(--qp-accent)] transition-transform duration-300",
                        open && "rotate-180",
                      )}
                      aria-hidden
                    />
                  </button>
                  <div
                    className={cn(
                      "grid transition-[grid-template-rows] duration-300 ease-out",
                      open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                    )}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <div className="flex items-start gap-3 border-t border-gray-100 px-4 pb-5 pt-4 dark:border-white/10 md:gap-4 md:px-5">
                        <span
                          aria-hidden
                          className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-100 tkad-type-caption font-bold text-gray-600 dark:bg-white/10 dark:text-white/70"
                        >
                          A
                        </span>
                        <p className="min-w-0 flex-1 text-sm leading-relaxed text-gray-600 dark:text-white/75">
                          {item.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}

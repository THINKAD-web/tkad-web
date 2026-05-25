"use client";

import { useLocale } from "next-intl";
import { useMemo, useState } from "react";
import { Search, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { FAQ_ITEMS, type FaqCategory } from "@/lib/faq-data";
import {
  NeonPageShell,
  neonCardClass,
  neonTitleClass,
} from "@/components/marketing/neon-page-shell";

type FaqTab = "all" | "general" | "payment" | "media" | "tech";

const TAB_TO_CATEGORIES: Record<Exclude<FaqTab, "all">, FaqCategory[]> = {
  general: ["other"],
  payment: ["cost"],
  media: ["ad"],
  tech: ["process"],
};

const CATEGORY_BADGE: Record<
  FaqCategory,
  { ko: string; en: string; className: string }
> = {
  ad: {
    ko: "매체",
    en: "Media",
    className: "bg-violet-500/15 text-violet-600 dark:text-violet-300",
  },
  process: {
    ko: "기술",
    en: "Tech",
    className: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
  },
  cost: {
    ko: "결제",
    en: "Payment",
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  other: {
    ko: "일반",
    en: "General",
    className: "bg-gray-500/10 text-gray-600 dark:text-white/70",
  },
};

export default function FaqPage() {
  const locale = useLocale();
  const isKo = locale === "ko";
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<FaqTab>("all");
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});

  const tabs: { value: FaqTab; label: string }[] = [
    { value: "all", label: isKo ? "전체" : "All" },
    { value: "general", label: isKo ? "일반" : "General" },
    { value: "payment", label: isKo ? "결제" : "Payment" },
    { value: "media", label: isKo ? "매체" : "Media" },
    { value: "tech", label: isKo ? "기술" : "Tech" },
  ];

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return FAQ_ITEMS.filter((item) => {
      if (activeTab !== "all") {
        const allowed = TAB_TO_CATEGORIES[activeTab];
        if (!allowed.includes(item.category)) return false;
      }
      if (!needle) return true;
      const q = isKo ? item.questionKo : item.questionEn;
      const a = isKo ? item.answerKo : item.answerEn;
      return `${q} ${a}`.toLowerCase().includes(needle);
    });
  }, [search, activeTab, isKo]);

  const toggle = (id: string) => {
    setOpenIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <NeonPageShell>
      <section className="relative overflow-hidden bg-[#05050a] py-16 tkad-neon-depth tkad-neon-grid sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-xs font-medium uppercase tracking-widest text-violet-400">
            FAQ
          </p>
          <h1 className={cn("mt-3", neonTitleClass, "text-white")}>
            {isKo ? "자주 묻는 질문" : "FAQ"}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-white/65">
            {isKo
              ? "THINKAD 서비스에 대해 자주 묻는 질문을 모았습니다."
              : "Answers to common questions about THINKAD services."}
          </p>
        </div>
      </section>

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
                "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors sm:text-sm",
                activeTab === tab.value
                  ? "bg-violet-500 text-white"
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
          <div className={cn(neonCardClass, "p-8 text-center")}>
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
              const badge = CATEGORY_BADGE[item.category];
              return (
                <li key={item.id} className={cn(neonCardClass, "overflow-hidden")}>
                  <button
                    type="button"
                    onClick={() => toggle(item.id)}
                    aria-expanded={open}
                    className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.03] md:gap-4 md:p-5"
                  >
                    <span
                      aria-hidden
                      className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 text-[11px] font-bold text-white"
                    >
                      Q
                    </span>
                    <span className="min-w-0 flex-1 space-y-2">
                      <span
                        className={cn(
                          "inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                          badge.className,
                        )}
                      >
                        {isKo ? badge.ko : badge.en}
                      </span>
                      <span className="block font-semibold leading-snug text-gray-900 dark:text-white">
                        {isKo ? item.questionKo : item.questionEn}
                      </span>
                    </span>
                    <ChevronDown
                      className={cn(
                        "mt-1 h-5 w-5 shrink-0 text-violet-500 transition-transform duration-300",
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
                          className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-[11px] font-bold text-gray-600 dark:bg-white/10 dark:text-white/70"
                        >
                          A
                        </span>
                        <p className="min-w-0 flex-1 text-sm leading-relaxed text-gray-600 dark:text-white/75">
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
      </section>
    </NeonPageShell>
  );
}

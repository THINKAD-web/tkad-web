"use client";

import { useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BookOpen, Search } from "lucide-react";
import {
  GLOSSARY_CATEGORIES,
  GLOSSARY_TERMS,
  type GlossaryCategory,
  type GlossaryTerm,
} from "@/lib/glossary-data";
import {
  NeonPageShell,
  neonCardClass,
  neonSubtitleClass,
  neonTitleClass,
} from "@/components/marketing/neon-page-shell";
import { cn } from "@/lib/utils";

const CATEGORY_ORDER: GlossaryCategory[] = [
  "media-type",
  "metric",
  "process",
  "tech",
  "buying",
];

function groupByCategory(terms: GlossaryTerm[]) {
  const map = new Map<GlossaryCategory, GlossaryTerm[]>();
  for (const cat of CATEGORY_ORDER) map.set(cat, []);
  for (const t of terms) {
    map.get(t.category)?.push(t);
  }
  return map;
}

export function GlossaryPageClient() {
  const locale = useLocale();
  const isKo = locale.startsWith("ko");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<GlossaryCategory | "all">(
    "all",
  );

  const grouped = useMemo(() => groupByCategory(GLOSSARY_TERMS), []);

  const filteredTerms = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return GLOSSARY_TERMS.filter((t) => {
      if (activeCategory !== "all" && t.category !== activeCategory) return false;
      if (!needle) return true;
      const hay = [
        t.term,
        t.termEn,
        t.definitionKo,
        t.definitionEn,
        ...(t.aliases ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [search, activeCategory]);

  const indexLetters = useMemo(() => {
    const set = new Set<string>();
    for (const t of filteredTerms) {
      const ch = (isKo ? t.term : t.termEn || t.term).charAt(0).toUpperCase();
      if (ch) set.add(ch);
    }
    return [...set].sort((a, b) => a.localeCompare(b, isKo ? "ko" : "en"));
  }, [filteredTerms, isKo]);

  return (
    <NeonPageShell>
      <section className="relative overflow-hidden bg-gray-50 py-16 text-gray-900 tkad-neon-depth tkad-neon-grid dark:bg-[#05050a] dark:text-white sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-medium uppercase tracking-widest text-violet-600 dark:text-violet-400">
            {isKo ? "용어집" : "Glossary"}
          </p>
          <h1 className={cn("mt-3 flex items-center gap-3", neonTitleClass)}>
            <BookOpen className="h-8 w-8 text-violet-600 dark:text-violet-400" aria-hidden />
            {isKo ? "옥외광고 용어집" : "OOH Advertising Glossary"}
          </h1>
          <p className={cn("mt-4 max-w-2xl", neonSubtitleClass)}>
            {isKo
              ? `OOH·DOOH·CPM·GRP 등 캠페인 기획 시 자주 쓰는 ${GLOSSARY_TERMS.length}개 핵심 용어`
              : `${GLOSSARY_TERMS.length} essential terms for OOH campaign planning`}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isKo ? "용어 검색…" : "Search terms…"}
            className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveCategory("all")}
            className={cn(
              "rounded-full px-3 py-1.5 tkad-type-title transition-colors",
              activeCategory === "all"
                ? "bg-violet-500 text-white"
                : "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-white/70",
            )}
          >
            {isKo ? "전체" : "All"}
          </button>
          {CATEGORY_ORDER.map((cat) => {
            const labels = GLOSSARY_CATEGORIES[cat];
            const count = grouped.get(cat)?.length ?? 0;
            if (count === 0) return null;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "rounded-full px-3 py-1.5 tkad-type-title transition-colors",
                  activeCategory === cat
                    ? "bg-violet-500 text-white"
                    : "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-white/70",
                )}
              >
                {isKo ? labels.ko : labels.en}
              </button>
            );
          })}
        </div>

        {indexLetters.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {indexLetters.map((letter) => (
              <a
                key={letter}
                href={`#glossary-${letter}`}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-xs font-bold text-gray-600 hover:bg-violet-100 hover:text-violet-600 dark:bg-white/10 dark:text-white/70 dark:hover:bg-violet-500/20 dark:hover:text-violet-300"
              >
                {letter}
              </a>
            ))}
          </div>
        ) : null}
      </section>

      <section className="mx-auto max-w-4xl space-y-4 px-4 pb-16 sm:px-6 lg:px-8">
        {filteredTerms.length === 0 ? (
          <div className={cn(neonCardClass, "p-8 text-center")}>
            <p className="text-gray-500 dark:text-white/60">
              {isKo ? "검색 결과가 없습니다." : "No terms match your search."}
            </p>
          </div>
        ) : (
          filteredTerms.map((t) => {
            const letter = (isKo ? t.term : t.termEn || t.term)
              .charAt(0)
              .toUpperCase();
            return (
              <article
                key={t.id}
                id={`term-${t.id}`}
                className={cn(neonCardClass, "scroll-mt-24 p-5 sm:p-6")}
              >
                <span id={`glossary-${letter}`} className="sr-only">
                  {letter}
                </span>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {isKo ? t.term : t.termEn || t.term}
                </h2>
                {t.termEn && isKo ? (
                  <p className="mt-1 text-xs text-gray-400 dark:text-white/45">
                    {t.termEn}
                  </p>
                ) : null}
                {t.abbreviationFull ? (
                  <p className="mt-2 text-xs font-medium text-violet-500 dark:text-violet-400">
                    {t.abbreviationFull}
                  </p>
                ) : null}
                <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-white/75">
                  {isKo ? t.definitionKo : t.definitionEn}
                </p>
              </article>
            );
          })
        )}

        <div className={cn(neonCardClass, "mt-8 p-6 text-center")}>
          <p className="font-semibold text-gray-900 dark:text-white">
            {isKo ? "용어를 익혔다면 매체를 비교해보세요" : "Ready to browse media?"}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link
              href="/media"
              className="rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-5 py-2.5 text-sm font-medium text-white"
            >
              {isKo ? "매체 검색" : "Browse media"}
            </Link>
            <Link
              href="/planner"
              className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 dark:border-white/10 dark:text-white/80"
            >
              {isKo ? "플래너 시작" : "Start planner"}
            </Link>
          </div>
        </div>
      </section>
    </NeonPageShell>
  );
}

"use client";

import { useMemo, useState, type ReactNode } from "react";
import { CasesFilterHub } from "@/components/cases/cases-filter-hub";
import { CaseStudyCard } from "@/components/cases/case-study-card";
import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PublicSuccessCaseListItem } from "@/lib/success-case-public";
import { resolveCasesCatalogView } from "@/lib/cases-catalog-layout";
import {
  emptyCaseFilters,
  hasActiveCaseFilters,
} from "@/lib/success-case-hub";

type Props = {
  locale: string;
  initialCases: PublicSuccessCaseListItem[];
  /** 서버에서 렌더한 기본 카탈로그 (SSR) */
  children: ReactNode;
};

export function CasesCatalogSection({
  locale,
  initialCases,
  children,
}: Props) {
  const t = useTranslations("cases");
  const isKo = locale === "ko" || locale.startsWith("ko");
  const [filters, setFilters] = useState(emptyCaseFilters);
  const [query, setQuery] = useState("");

  const active = hasActiveCaseFilters(filters, query);
  const { filtered, recommended, gridCases } = useMemo(
    () => resolveCasesCatalogView(initialCases, filters, query),
    [initialCases, filters, query],
  );

  const resetFilters = () => {
    setFilters(emptyCaseFilters());
    setQuery("");
  };

  return (
    <>
      <CasesFilterHub
        filters={filters}
        onChange={setFilters}
        query={query}
        onQueryChange={setQuery}
        onReset={resetFilters}
        resultCount={filtered.length}
      />

      {!active ? (
        children
      ) : (
        <div data-cases-region="filtered">
          {recommended.length > 0 ? (
            <section className="mb-12">
              <div className="mb-5">
                <p className="flex items-center gap-2 font-display text-xs font-medium uppercase tracking-[0.22em] text-[#a855f7]">
                  <Sparkles className="h-3.5 w-3.5" />
                  [ {t("recommendedTitle")} ]
                </p>
                <p className="mt-1 text-sm dark:text-white text-gray-500">
                  {t("recommendedSubtitle")}
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {recommended.map((cs) => (
                  <CaseStudyCard key={cs.id} item={cs} />
                ))}
              </div>
            </section>
          ) : null}
          {gridCases.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {gridCases.map((cs) => (
                <CaseStudyCard key={cs.id} item={cs} />
              ))}
            </div>
          ) : (
            <p className="rounded-[20px] border dark:border-white/12 border-gray-200 dark:bg-white/5 bg-gray-50 py-16 text-center text-sm dark:text-white text-gray-500">
              {isKo
                ? "선택한 필터에 맞는 사례가 없습니다. 필터를 조정해 보세요."
                : "No cases match your filters. Try adjusting them."}
            </p>
          )}
        </div>
      )}
    </>
  );
}

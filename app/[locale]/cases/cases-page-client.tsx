"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { categoryHeroCtaPrimaryClass } from "@/components/category-explore-hero";
import { NeonSection } from "@/components/landing/neon/neon-section";
import { CasesFilterHub } from "@/components/cases/cases-filter-hub";
import { CaseStudyCard } from "@/components/cases/case-study-card";
import { ArrowRight, Sparkles } from "lucide-react";
import type { PublicSuccessCaseListItem } from "@/lib/success-case-public";
import { isSampleSuccessCaseId } from "@/lib/sample-success-case";
import {
  emptyCaseFilters,
  hasActiveCaseFilters,
  matchesCaseFilters,
} from "@/lib/success-case-hub";

type Props = {
  initialCases: PublicSuccessCaseListItem[];
  hero: ReactNode;
};

export default function CasesPageClient({ initialCases, hero }: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const isKo = locale === "ko";
  const [filters, setFilters] = useState(emptyCaseFilters);
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () =>
      initialCases.filter((c) => matchesCaseFilters(c, filters, query)),
    [initialCases, filters, query],
  );

  const recommended = useMemo(() => {
    const source = hasActiveCaseFilters(filters, query) ? filtered : initialCases;
    return [...source].sort((a, b) => {
      const ta = a.publishedAtIso ? Date.parse(a.publishedAtIso) : 0;
      const tb = b.publishedAtIso ? Date.parse(b.publishedAtIso) : 0;
      return tb - ta;
    }).slice(0, 3);
  }, [filtered, initialCases, filters, query]);

  const gridCases = useMemo(() => {
    const recIds = new Set(recommended.map((c) => c.id));
    return filtered.filter((c) => !recIds.has(c.id));
  }, [filtered, recommended]);

  const empty = initialCases.length === 0;

  const featureCards = [
    {
      titleKey: "cases.reportFeature1Title" as const,
      descKey: "cases.reportFeature1Desc" as const,
    },
    {
      titleKey: "cases.reportFeature2Title" as const,
      descKey: "cases.reportFeature2Desc" as const,
    },
    {
      titleKey: "cases.reportFeature3Title" as const,
      descKey: "cases.reportFeature3Desc" as const,
    },
  ];

  const resetFilters = () => {
    setFilters(emptyCaseFilters());
    setQuery("");
  };

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-planner-neon bg-[#0A0A0A]">
        {hero}

        <NeonSection className="pb-0 pt-40 sm:pb-0 sm:pt-48">
          {empty ? (
            <div className="space-y-14">
              <p className="mx-auto max-w-3xl text-center text-lg font-bold leading-relaxed text-white/85 sm:text-xl">
                {t("cases.reportLead")}
              </p>
              <div className="grid gap-4 md:grid-cols-3">
                {featureCards.map((card) => (
                  <div
                    key={card.titleKey}
                    className="rounded-[20px] border border-white/12 bg-white/5 p-5 backdrop-blur"
                  >
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#22d3ee]">
                      [ {t(card.titleKey)} ]
                    </p>
                    <p className="mt-3 font-mono text-[12px] leading-relaxed tracking-tight text-white/60">
                      {t(card.descKey)}
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex flex-col items-center justify-center">
                <Link href="/quote" className={categoryHeroCtaPrimaryClass}>
                  {t("cases.reportCtaQuote")}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </div>
          ) : (
            <>
              <p className="mb-4 text-center font-mono text-[12px] tracking-tight text-white/55 sm:text-sm">
                {`// `}{t("cases.listIntro")}
              </p>
              {initialCases.some((c) => isSampleSuccessCaseId(c.id)) ? (
                <p className="mb-6 text-center font-mono text-[11px] tracking-tight text-white/45">
                  {`// `}{t("cases.sampleDataNote")}
                </p>
              ) : null}

              <CasesFilterHub
                filters={filters}
                onChange={setFilters}
                query={query}
                onQueryChange={setQuery}
                onReset={resetFilters}
                resultCount={filtered.length}
              />

              {recommended.length > 0 ? (
                <section className="mb-12">
                  <div className="mb-5 flex items-end justify-between gap-4">
                    <div>
                      <p className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#a855f7]">
                        <Sparkles className="h-3.5 w-3.5" />
                        [ {t("cases.recommendedTitle")} ]
                      </p>
                      <p className="mt-1 text-sm text-white/55">
                        {t("cases.recommendedSubtitle")}
                      </p>
                    </div>
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
              ) : filtered.length === 0 ? (
                <p className="rounded-[20px] border border-white/12 bg-white/5 py-16 text-center text-sm text-white/55">
                  {isKo
                    ? "선택한 필터에 맞는 사례가 없습니다. 필터를 조정해 보세요."
                    : "No cases match your filters. Try adjusting them."}
                </p>
              ) : null}

              <div className="mt-16 rounded-[24px] border border-[#22d3ee]/25 bg-gradient-to-br from-[#a855f7]/15 via-transparent to-[#22d3ee]/10 px-6 py-10 text-center">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#22d3ee]">
                  [ NEXT STEP ]
                </p>
                <h2 className="mt-3 text-xl font-bold tracking-tight text-white sm:text-2xl">
                  {t("cases.sectionCtaTitle")}
                </h2>
                <p className="mx-auto mt-3 max-w-xl font-mono text-[12px] tracking-tight text-white/60">
                  {`// `}{t("cases.sectionCtaDesc")}
                </p>
                <div className="mt-6 inline-flex">
                  <Link href="/contact" className={categoryHeroCtaPrimaryClass}>
                    {t("cases.sectionCtaButton")}
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
              </div>
            </>
          )}
        </NeonSection>
      </div>
    </HomeLandingDayNight>
  );
}

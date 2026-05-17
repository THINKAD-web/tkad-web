"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BtnBlock } from "@/components/brutalist";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import {
  CategoryExploreHero,
  CategoryHeroCtaRow,
  categoryHeroCtaPrimaryClass,
  categoryHeroCtaSecondaryClass,
} from "@/components/category-explore-hero";
import { NeonSection } from "@/components/landing/neon/neon-section";
import {
  ArrowRight,
  RotateCcw,
  Search,
} from "lucide-react";
import { CaseStudyCard } from "@/components/cases/case-study-card";
import { cn } from "@/lib/utils";
import type { PublicSuccessCaseListItem } from "@/lib/success-case-public";
import { isSampleSuccessCaseId } from "@/lib/sample-success-case";

type Props = { initialCases: PublicSuccessCaseListItem[] };

export default function CasesPageClient({ initialCases }: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const isKo = locale === "ko";
  const [industry, setIndustry] = useState<string>("all");
  const [query, setQuery] = useState("");

  const industries = useMemo(() => {
    const set = new Set(
      initialCases.map((c) => c.industry.trim()).filter(Boolean),
    );
    return ["all", ...[...set].sort((a, b) => a.localeCompare(b, "ko"))];
  }, [initialCases]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return initialCases.filter((c) => {
      if (industry !== "all" && c.industry !== industry) return false;
      if (!q) return true;
      const hay = [
        c.titleKo,
        c.titleEn ?? "",
        c.clientName,
        c.summaryKo,
        ...c.mediaUsed,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [initialCases, industry, query]);

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

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-planner-neon">
        <CategoryExploreHero
          code="// 01 · CASES"
          headlineBefore={isKo ? "브랜드가 선택한 " : "Brands chose "}
          headlineGradient={isKo ? "성공 사례" : "success stories"}
          subtitle={empty ? t("cases.reportHeroSubtitle") : t("cases.subtitle")}
        >
            <CategoryHeroCtaRow>
              <Link href="/quote" className={categoryHeroCtaPrimaryClass}>
                {t("cases.reportCtaQuote")}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link href="/contact" className={categoryHeroCtaSecondaryClass}>
                {isKo ? "무료 상담" : "Free consult"}
                <ArrowRight className="h-4 w-4 text-white/80" aria-hidden />
              </Link>
            </CategoryHeroCtaRow>
        </CategoryExploreHero>


        <NeonSection className="pb-0 pt-40 sm:pb-0 sm:pt-48">
          {empty ? (
            <div className="space-y-14">
              <p className="mx-auto max-w-3xl text-center text-lg font-bold leading-relaxed text-foreground sm:text-xl">
                {t("cases.reportLead")}
              </p>

              <div className="grid gap-0 md:grid-cols-3">
                {featureCards.map((card) => (
                  <div
                    key={card.titleKey}
                    className="-mt-[2px] -ml-[2px] border-2 border-border bg-card p-5"
                  >
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                      [ {t(card.titleKey)} ]
                    </p>
                    <p className="mt-3 font-mono text-[12px] leading-relaxed tracking-tight text-muted-foreground">
                      {t(card.descKey)}
                    </p>
                  </div>
                ))}
              </div>

              <div>
                <div className="mx-auto max-w-2xl border-2 border-border bg-card p-6 sm:p-8">
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <span className="border-2 border-border bg-primary px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary-foreground">
                      [ {t("cases.reportSampleBadge")} ]
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                      {t("cases.reportSampleLabel")}
                    </span>
                  </div>
                  <div className="space-y-3 border-2 border-border bg-muted p-4">
                    <div className="h-2.5 w-3/4 bg-hero-void" />
                    <div className="h-2 w-1/2 bg-hero-void/40" />
                    <div className="mt-4 space-y-2 border-t-2 border-border pt-4">
                      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                        [ {t("cases.reportSampleLine1")} ]
                      </p>
                      <div className="h-16 border-2 border-border bg-card" />
                      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                        [ {t("cases.reportSampleLine2")} ]
                      </p>
                      <div className="flex gap-0">
                        <div className="-ml-[2px] h-12 flex-1 border-2 border-primary bg-primary" />
                        <div className="-ml-[2px] h-12 flex-1 border-2 border-border bg-card" />
                        <div className="-ml-[2px] h-12 flex-1 border-2 border-border bg-card" />
                      </div>
                      <p className="pt-1 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                        [ {t("cases.reportSampleLine3")} ]
                      </p>
                      <div className="h-2 w-full bg-hero-void/30" />
                      <div className="h-2 w-5/6 bg-hero-void/20" />
                    </div>
                  </div>
                </div>
                <p className="mt-4 text-center font-mono text-[11px] tracking-tight text-muted-foreground">
                  {`// `}{t("cases.reportSampleCaption")}
                </p>
              </div>

              <div className="flex flex-col items-center justify-center">
                <BtnBlock href="/quote" variant="accent" size="lg">
                  {t("cases.reportCtaQuote")}
                </BtnBlock>
              </div>
            </div>
          ) : (
            <>
              <p className="mb-4 text-center font-mono text-[12px] tracking-tight text-muted-foreground sm:text-sm">
                {`// `}{t("cases.listIntro")}
              </p>
              {initialCases.some((c) => isSampleSuccessCaseId(c.id)) ? (
                <p className="mb-10 text-center font-mono text-[11px] tracking-tight text-muted-foreground">
                  {`// `}{t("cases.sampleDataNote")}
                </p>
              ) : (
                <div className="mb-10" />
              )}

              <div className="mb-8 space-y-4">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                  [ {t("cases.filterIndustry")} ]
                </p>
                <div className="flex flex-wrap gap-0">
                  {industries.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setIndustry(key)}
                      className={cn(
                        "-mt-[2px] -ml-[2px] border-2 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] transition-colors",
                        industry === key
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-foreground hover:bg-muted",
                      )}
                    >
                      {key === "all" ? t("cases.all") : key}
                    </button>
                  ))}
                </div>

                <div className="flex flex-col gap-3 border-2 border-border bg-card p-4 sm:flex-row sm:flex-wrap sm:items-stretch">
                  <div className="relative min-w-[200px] flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={t("cases.searchPlaceholder")}
                      className="h-11 w-full border-2 border-border bg-card pl-10 pr-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                      aria-label={t("cases.searchPlaceholder")}
                    />
                  </div>
                  <BtnBlock
                    variant="secondary"
                    size="md"
                    onClick={() => {
                      setIndustry("all");
                      setQuery("");
                    }}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    {t("cases.resetFilters")}
                  </BtnBlock>
                </div>

                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  {`// `}{t("cases.resultsCount", { count: filtered.length })}
                </p>
              </div>

              <div className="grid gap-0 md:grid-cols-2 lg:grid-cols-3">
                {filtered.map((cs) => (
                  <CaseStudyCard key={cs.id} item={cs} />
                ))}
              </div>

              <div className="mt-16 border-2 border-primary bg-hero-void px-6 py-10 text-center">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                  [ NEXT STEP ]
                </p>
                <h2 className="mt-3 text-xl font-bold tracking-tight text-hero-fg sm:text-2xl">
                  {t("cases.sectionCtaTitle")}
                </h2>
                <p className="mx-auto mt-3 max-w-xl font-mono text-[12px] tracking-tight text-hero-fg/75">
                  {`// `}{t("cases.sectionCtaDesc")}
                </p>
                <div className="mt-6 inline-flex">
                  <BtnBlock href="/contact" variant="accent" size="lg">
                    {t("cases.sectionCtaButton")}
                  </BtnBlock>
                </div>
              </div>
            </>
          )}
        </NeonSection>
      </div>
    </HomeLandingDayNight>
  );
}

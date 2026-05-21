import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import {
  CategoryExploreHero,
  CategoryHeroCtaRow,
  categoryHeroCtaPrimaryClass,
  categoryHeroCtaSecondaryClass,
} from "@/components/category-explore-hero";
import { NeonSection } from "@/components/landing/neon/neon-section";
import { CasesCatalogGrids } from "@/components/cases/cases-catalog-grids";
import { CasesCatalogSection } from "@/components/cases/cases-catalog-section";
import type { PublicSuccessCaseListItem } from "@/lib/success-case-public";
import { isSampleSuccessCaseId } from "@/lib/sample-success-case";
import { resolveCasesCatalogView } from "@/lib/cases-catalog-layout";
import { emptyCaseFilters } from "@/lib/success-case-hub";

type Props = {
  locale: string;
  cases: PublicSuccessCaseListItem[];
};

export async function CasesPageContent({ locale, cases }: Props) {
  setRequestLocale(locale);
  const t = await getTranslations({ locale });
  const isKo = locale === "ko" || locale.startsWith("ko");
  const empty = cases.length === 0;

  const { recommended, gridCases } = resolveCasesCatalogView(
    cases,
    emptyCaseFilters(),
    "",
  );

  const featureCards = [
    { titleKey: "cases.reportFeature1Title" as const, descKey: "cases.reportFeature1Desc" as const },
    { titleKey: "cases.reportFeature2Title" as const, descKey: "cases.reportFeature2Desc" as const },
    { titleKey: "cases.reportFeature3Title" as const, descKey: "cases.reportFeature3Desc" as const },
  ];

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-planner-neon">
        <CategoryExploreHero
          code="// 01 · CASES"
          showBeta
          headlineBefore={isKo ? "브랜드가 선택한 " : "Brands chose "}
          headlineGradient={isKo ? "성공 사례 허브" : "success story hub"}
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
              {cases.some((c) => isSampleSuccessCaseId(c.id)) ? (
                <p className="mb-6 text-center font-mono text-[11px] tracking-tight text-white/45">
                  {`// `}{t("cases.sampleDataNote")}
                </p>
              ) : null}

              <CasesCatalogSection locale={locale} initialCases={cases}>
                <CasesCatalogGrids
                  locale={locale}
                  recommended={recommended}
                  gridCases={gridCases}
                />
              </CasesCatalogSection>

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

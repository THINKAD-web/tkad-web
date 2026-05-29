import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { GUARANTEE_PAGE_META } from "@/lib/guarantee-page-content";
import { buildShareMetadata, pageAlternates, serializeJsonLd } from "@/lib/seo";
import { buildBreadcrumbJsonLd } from "@/lib/structured-data";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { PageHero } from "@/components/layout/page-hero";
import { SubTabsBar } from "@/components/layout/sub-tabs-bar";
import {
  CategoryHeroCtaRow,
  categoryHeroCtaPrimaryClass,
  categoryHeroCtaSecondaryClass,
} from "@/components/category-explore-hero";
import {
  GuaranteeCategoryNav,
  GuaranteePageSections,
} from "@/components/guarantee/guarantee-page-sections";
import { NeonSection } from "@/components/landing/neon/neon-section";
import { ArrowRight } from "lucide-react";

type Props = { params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  const title = isKo ? GUARANTEE_PAGE_META.titleKo : GUARANTEE_PAGE_META.titleEn;
  const description = isKo
    ? GUARANTEE_PAGE_META.descriptionKo
    : GUARANTEE_PAGE_META.descriptionEn;

  return {
    title,
    description,
    keywords: [...(isKo ? GUARANTEE_PAGE_META.keywordsKo : GUARANTEE_PAGE_META.keywordsEn)],
    alternates: pageAlternates(locale, "/guarantee"),
    ...buildShareMetadata({
      locale,
      title,
      description,
      path: "/guarantee",
      type: "article",
    }),
  };
}

export default async function GuaranteePage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const isKo = locale === "ko";

  const breadcrumb = buildBreadcrumbJsonLd(locale, [
    { name: isKo ? "홈" : "Home", path: "" },
    { name: isKo ? GUARANTEE_PAGE_META.titleKo : GUARANTEE_PAGE_META.titleEn, path: "/guarantee" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumb) }}
      />

      <HomeLandingDayNight>
        <div className="tkad-landing-neon tkad-planner-neon">
          <PageHero
            eyebrow={GUARANTEE_PAGE_META.heroEyebrow}
            title={isKo ? GUARANTEE_PAGE_META.heroTitleKo : GUARANTEE_PAGE_META.heroTitleEn}
            highlight={
              isKo ? GUARANTEE_PAGE_META.heroHighlightKo : GUARANTEE_PAGE_META.heroHighlightEn
            }
            description={
              isKo ? GUARANTEE_PAGE_META.heroDescriptionKo : GUARANTEE_PAGE_META.heroDescriptionEn
            }
          />
          <SubTabsBar group="policy" currentPath="/guarantee" />
          <div className="border-b border-white/10 px-4 pb-6">
            <CategoryHeroCtaRow>
              <Link href="/planner" className={categoryHeroCtaPrimaryClass}>
                {isKo ? "AI 플래너로 예측 보기" : "View forecasts in AI planner"}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link href="/refund" className={categoryHeroCtaSecondaryClass}>
                {isKo ? "환불 정책" : "Refund policy"}
                <ArrowRight className="h-4 w-4 dark:text-white text-gray-700" aria-hidden />
              </Link>
            </CategoryHeroCtaRow>
            <p className="mt-4 font-display text-xs font-medium uppercase tracking-[0.22em] dark:text-white/45 text-gray-500">
              {`// ${isKo ? "최종 갱신" : "Last updated"}: ${GUARANTEE_PAGE_META.lastUpdated}`}
            </p>
          </div>

          <NeonSection className="border-t-0 py-8 sm:py-10">
            <div className="mx-auto max-w-3xl">
              <p className="font-display text-xs font-medium uppercase tracking-[0.22em] dark:text-white/55 text-gray-500">
                [ {isKo ? "카테고리" : "CATEGORIES"} ]
              </p>
              <div className="mt-4">
                <GuaranteeCategoryNav isKo={isKo} />
              </div>
            </div>
          </NeonSection>

          <GuaranteePageSections isKo={isKo} />
        </div>
      </HomeLandingDayNight>
    </>
  );
}

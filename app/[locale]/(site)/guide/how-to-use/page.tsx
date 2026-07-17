import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import {
  HOW_TO_USE_FAQS,
  HOW_TO_USE_META,
  HOW_TO_USE_STEPS,
} from "@/lib/guide-how-to-use-content";
import { buildShareMetadata, pageAlternates, serializeJsonLd } from "@/lib/seo";
import { buildBreadcrumbJsonLd } from "@/lib/structured-data";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import {
  CategoryExploreHero,
  CategoryHeroCtaRow,
  categoryHeroCtaPrimaryClass,
  categoryHeroCtaSecondaryClass,
} from "@/components/category-explore-hero";
import { NeonSection } from "@/components/landing/neon/neon-section";
import { NeonSectionHead } from "@/components/landing/neon/neon-section-head";
import { HowToUseStepsGrid } from "@/components/guide/how-to-use-steps-grid";
import { HowToUseFaq } from "@/components/guide/how-to-use-faq";
import { HowToUseCta } from "@/components/guide/how-to-use-cta";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";

type Props = { params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  const title = isKo ? HOW_TO_USE_META.titleKo : HOW_TO_USE_META.titleEn;
  const description = isKo
    ? HOW_TO_USE_META.descriptionKo
    : HOW_TO_USE_META.descriptionEn;

  return {
    title,
    description,
    keywords: isKo ? HOW_TO_USE_META.keywordsKo : HOW_TO_USE_META.keywordsEn,
    alternates: pageAlternates(locale, "/guide/how-to-use"),
    ...buildShareMetadata({
      locale,
      title,
      description,
      path: "/guide/how-to-use",
      type: "article",
    }),
  };
}

function buildFaqJsonLd(locale: string) {
  const isKo = locale === "ko";
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: isKo ? "ko-KR" : "en-US",
    mainEntity: HOW_TO_USE_FAQS.map((f) => ({
      "@type": "Question",
      name: isKo ? f.questionKo : f.questionEn,
      acceptedAnswer: {
        "@type": "Answer",
        text: isKo ? f.answerKo : f.answerEn,
      },
    })),
  };
}

export default async function HowToUseGuidePage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const isKo = locale === "ko";
  const t = await getTranslations({ locale, namespace: "footer" });

  const breadcrumbLd = buildBreadcrumbJsonLd(locale, [
    { name: isKo ? "홈" : "Home", path: "" },
    { name: isKo ? "사용 가이드" : "How to use", path: "/guide/how-to-use" },
  ]);

  const faqLd = buildFaqJsonLd(locale);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqLd) }}
      />

      <HomeLandingDayNight>
        <div className="tkad-landing-neon tkad-planner-neon">
          <CategoryExploreHero
            code={`// ${isKo ? "사용 가이드" : "HOW TO USE"}`}
            headlineBefore={isKo ? "처음이세요? " : "New here? "}
            headlineGradient={isKo ? "3분이면 충분해요" : "3 minutes is enough"}
            subtitle={
              isKo
                ? "매체 탐색부터 견적 요청까지 단계별로 안내해드립니다."
                : "Step-by-step from media discovery to requesting a quote."
            }
            showBeta={false}
          >
            <CategoryHeroCtaRow>
              <Link href="/media" className={categoryHeroCtaPrimaryClass}>
                {isKo ? "매체 검색 시작" : "Browse media"}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link href="/planner" className={categoryHeroCtaSecondaryClass}>
                {isKo ? "AI 플래너" : "AI planner"}
                <ArrowRight className="h-4 w-4 dark:text-white text-gray-700" aria-hidden />
              </Link>
            </CategoryHeroCtaRow>
          </CategoryExploreHero>

          <NeonSection tone="qp" className="pt-10 pb-12 sm:pt-16 sm:pb-20">
            <NeonSectionHead
              number="01"
              kicker={isKo ? "STEP" : "STEP"}
              title={
                isKo ? (
                  <>
                    THINKAD 이용 <span className="tkad-home-accent-text">6단계</span>
                  </>
                ) : (
                  <>
                    <span className="tkad-home-accent-text">6 steps</span> on THINKAD
                  </>
                )
              }
              meta={isKo ? "탐색 → 비교 → 패키지 → 플래너 → 견적 → 포인트" : "Discover → compare → packages → planner → quote → points"}
            />
            <HowToUseStepsGrid steps={HOW_TO_USE_STEPS} isKo={isKo} />
          </NeonSection>

          <NeonSection tone="qp" className="pt-4 pb-12 sm:pb-20">
            <NeonSectionHead
              number="02"
              kicker="FAQ"
              title={
                isKo ? (
                  <>
                    자주 묻는 <span className="tkad-home-accent-text">질문</span>
                  </>
                ) : (
                  <>
                    Frequently asked <span className="tkad-home-accent-text">questions</span>
                  </>
                )
              }
              meta={isKo ? `${HOW_TO_USE_FAQS.length}개` : `${HOW_TO_USE_FAQS.length} items`}
            />
            <HowToUseFaq items={HOW_TO_USE_FAQS} isKo={isKo} />
          </NeonSection>

          <div className="mx-auto max-w-4xl px-4 pb-20 sm:px-6">
            <HowToUseCta isKo={isKo} phone={t("phone")} />
          </div>
        </div>
      </HomeLandingDayNight>
    </>
  );
}

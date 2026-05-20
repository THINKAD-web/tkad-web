import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { BookOpen } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import {
  BEGINNER_BASICS_CARDS,
  BEGINNER_FAQS,
  BEGINNER_GUIDE_META,
  BEGINNER_TIMELINE,
} from "@/lib/guides-beginner-content";
import { listGuideMeta } from "@/lib/guides-data";
import { pageAlternates, serializeJsonLd, siteUrl } from "@/lib/seo";
import {
  buildBreadcrumbJsonLd,
  buildCollectionPageJsonLd,
} from "@/lib/structured-data";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { MediaKeywordLandingHero } from "@/components/media-keyword-landing-hero";
import { NeonSection } from "@/components/landing/neon/neon-section";
import { NeonSectionHead } from "@/components/landing/neon/neon-section-head";
import { GuidesBeginnerBasicsGrid } from "@/components/guides/guides-beginner-basics-grid";
import { GuidesBeginnerTimeline } from "@/components/guides/guides-beginner-timeline";
import { GuidesBeginnerFaq } from "@/components/guides/guides-beginner-faq";
import { GuidesBeginnerCta } from "@/components/guides/guides-beginner-cta";
import { ArrowRight } from "lucide-react";

type Props = { params: Promise<{ locale: string }> };

export const revalidate = 3600;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  const title = isKo ? BEGINNER_GUIDE_META.titleKo : BEGINNER_GUIDE_META.titleEn;
  const description = isKo
    ? BEGINNER_GUIDE_META.descriptionKo
    : BEGINNER_GUIDE_META.descriptionEn;

  return {
    title,
    description,
    keywords: isKo ? BEGINNER_GUIDE_META.keywordsKo : BEGINNER_GUIDE_META.keywordsEn,
    alternates: pageAlternates(locale, "/guides"),
    openGraph: { title, description, type: "article" },
    twitter: { card: "summary_large_image", title, description },
  };
}

function buildFaqJsonLd(locale: string) {
  const isKo = locale === "ko";
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: isKo ? "ko-KR" : "en-US",
    mainEntity: BEGINNER_FAQS.map((f) => ({
      "@type": "Question",
      name: isKo ? f.questionKo : f.questionEn,
      acceptedAnswer: {
        "@type": "Answer",
        text: isKo ? f.answerKo : f.answerEn,
      },
    })),
  };
}

function buildArticleJsonLd(locale: string) {
  const isKo = locale === "ko";
  const url = `${siteUrl.replace(/\/$/, "")}/${locale}/guides`;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${url}#article`,
    headline: (isKo ? BEGINNER_GUIDE_META.heroTitleKo : BEGINNER_GUIDE_META.heroTitleEn).slice(
      0,
      110,
    ),
    description: isKo ? BEGINNER_GUIDE_META.descriptionKo : BEGINNER_GUIDE_META.descriptionEn,
    url,
    datePublished: BEGINNER_GUIDE_META.publishedAt,
    dateModified: BEGINNER_GUIDE_META.publishedAt,
    inLanguage: isKo ? "ko-KR" : "en-US",
    author: { "@id": `${siteUrl}/#organization` },
    publisher: { "@id": `${siteUrl}/#organization` },
    mainEntityOfPage: url,
  };
}

export default async function GuidesIndexPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const isKo = locale === "ko";

  const otherGuides = listGuideMeta().filter((g) => !g.draft);

  const ld = [
    buildBreadcrumbJsonLd(locale, [
      { name: isKo ? "홈" : "Home", path: "" },
      { name: isKo ? "OOH 초보 가이드" : "OOH beginner guide", path: "/guides" },
    ]),
    buildCollectionPageJsonLd(locale, {
      path: "/guides",
      name: isKo ? BEGINNER_GUIDE_META.titleKo : BEGINNER_GUIDE_META.titleEn,
      description: isKo
        ? BEGINNER_GUIDE_META.descriptionKo
        : BEGINNER_GUIDE_META.descriptionEn,
      items: otherGuides.map((g) => ({
        name: isKo ? g.titleKo : g.titleEn,
        path: `/guides/${g.slug}`,
        description: isKo ? g.descriptionKo : g.descriptionEn,
        datePublished: g.publishedAt,
      })),
    }),
    buildArticleJsonLd(locale),
    buildFaqJsonLd(locale),
  ];

  const sectionCopy = {
    basicsKicker: isKo ? "기초" : "BASICS",
    basicsTitle: isKo ? (
      <>
        OOH 광고 <span className="tkad-home-accent-text">기초</span>
      </>
    ) : (
      <>
        OOH <span className="tkad-home-accent-text">fundamentals</span>
      </>
    ),
    basicsMeta: isKo ? "처음 알아두면 좋은 6가지" : "Six essentials for beginners",
    timelineKicker: isKo ? "집행" : "PROCESS",
    timelineTitle: isKo ? (
      <>
        단계별 <span className="tkad-home-accent-text">집행 가이드</span>
      </>
    ) : (
      <>
        Step-by-step <span className="tkad-home-accent-text">execution</span>
      </>
    ),
    timelineMeta: isKo ? "탐색부터 리포트까지" : "From discovery to reporting",
    faqKicker: isKo ? "FAQ" : "FAQ",
    faqTitle: isKo ? (
      <>
        자주 묻는 <span className="tkad-home-accent-text">질문</span>
      </>
    ) : (
      <>
        Frequently asked <span className="tkad-home-accent-text">questions</span>
      </>
    ),
    faqMeta: isKo ? `${BEGINNER_FAQS.length}개` : `${BEGINNER_FAQS.length} items`,
    ctaTitle: isKo ? "이제 시작할 준비가 됐나요?" : "Ready to get started?",
    mediaCta: isKo ? "매체 탐색하기" : "Browse media",
    plannerCta: isKo ? "AI 플래너 써보기" : "Try AI planner",
    contactCta: isKo ? "무료 컨설팅 신청" : "Free consultation",
    moreGuides: isKo ? "지역별 심화 가이드" : "Regional deep-dive guides",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(ld) }}
      />

      <HomeLandingDayNight>
        <div className="tkad-landing-neon tkad-planner-neon tkad-media-page">
          <MediaKeywordLandingHero
            eyebrow={`// ${isKo ? "초보자 가이드" : "BEGINNER GUIDE"}`}
            title={isKo ? BEGINNER_GUIDE_META.heroTitleKo : BEGINNER_GUIDE_META.heroTitleEn}
            description={
              isKo ? BEGINNER_GUIDE_META.heroSubtitleKo : BEGINNER_GUIDE_META.heroSubtitleEn
            }
            icon={<BookOpen className="size-7 text-white/90" aria-hidden />}
            primaryCta={{
              href: "/media",
              label: isKo ? "매체 탐색하기" : "Browse media",
            }}
            secondaryCta={{
              href: "/planner",
              label: isKo ? "AI 플래너" : "AI planner",
            }}
            showBeta={false}
          />

          <NeonSection className="pt-10 pb-12 sm:pt-16 sm:pb-20">
            <NeonSectionHead
              number="01"
              kicker={sectionCopy.basicsKicker}
              title={sectionCopy.basicsTitle}
              meta={sectionCopy.basicsMeta}
            />
            <GuidesBeginnerBasicsGrid cards={BEGINNER_BASICS_CARDS} isKo={isKo} />
          </NeonSection>

          <NeonSection className="pt-4 pb-12 sm:pb-20">
            <NeonSectionHead
              number="02"
              kicker={sectionCopy.timelineKicker}
              title={sectionCopy.timelineTitle}
              meta={sectionCopy.timelineMeta}
            />
            <div className="mx-auto max-w-2xl">
              <GuidesBeginnerTimeline steps={BEGINNER_TIMELINE} isKo={isKo} />
            </div>
          </NeonSection>

          <NeonSection className="pt-4 pb-12 sm:pb-20">
            <NeonSectionHead
              number="03"
              kicker={sectionCopy.faqKicker}
              title={sectionCopy.faqTitle}
              meta={sectionCopy.faqMeta}
            />
            <GuidesBeginnerFaq items={BEGINNER_FAQS} isKo={isKo} />
          </NeonSection>

          <NeonSection className="pt-4 pb-16 sm:pb-24">
            <GuidesBeginnerCta
              isKo={isKo}
              title={sectionCopy.ctaTitle}
              mediaCta={sectionCopy.mediaCta}
              plannerCta={sectionCopy.plannerCta}
              contactCta={sectionCopy.contactCta}
            />

            {otherGuides.length > 0 ? (
              <div className="mt-12">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/55">
                  [ {sectionCopy.moreGuides} ]
                </p>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {otherGuides.map((g) => (
                    <li key={g.slug}>
                      <Link
                        href={`/guides/${g.slug}`}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-white/12 bg-white/5 px-4 py-4 text-sm font-semibold text-white transition hover:bg-white/10"
                      >
                        <span className="min-w-0 truncate">
                          {isKo ? g.titleKo : g.titleEn}
                        </span>
                        <ArrowRight className="h-4 w-4 shrink-0 text-white/50" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </NeonSection>
        </div>
      </HomeLandingDayNight>
    </>
  );
}

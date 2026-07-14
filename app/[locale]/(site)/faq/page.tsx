import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { getPublicFaqs } from "@/lib/public-faq";
import {
  pageAlternates,
  segmentOpenGraphImages,
  serializeJsonLd,
} from "@/lib/seo";
import { ogAltForRoute } from "@/lib/og-route-copy";
import { buildBreadcrumbJsonLd } from "@/lib/structured-data";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { PageHero } from "@/components/layout/page-hero";
import { FaqPageClient } from "@/components/faq/faq-page-client";
import { FAQ_CATALOG } from "@/lib/seo-content/faq-catalog";

type Props = { params: Promise<{ locale: string }> };

const FAQ_META_KO = {
  title: "옥외광고 FAQ — 자주 묻는 질문 | THINKAD 싱커드",
  description:
    "옥외광고 단가, 집행 방법, 효과 측정까지 옥외광고에 관한 모든 궁금증을 해결해드립니다.",
  openGraphTitle: "옥외광고 FAQ | THINKAD 싱커드",
} as const;

const FAQ_META_EN = {
  title: "OOH advertising FAQ | THINKAD",
  description:
    "Answers on OOH rates, execution, measurement, and how to get started with THINKAD.",
  openGraphTitle: "OOH FAQ | THINKAD",
} as const;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  const meta = isKo ? FAQ_META_KO : FAQ_META_EN;

  return {
    title: meta.title,
    description: meta.description,
    alternates: pageAlternates(locale, "/faq"),
    openGraph: {
      title: meta.openGraphTitle,
      description: meta.description,
      images: segmentOpenGraphImages(locale, "faq", ogAltForRoute("faq")),
    },
    twitter: {
      card: "summary_large_image",
      title: meta.openGraphTitle,
      description: meta.description,
      images: segmentOpenGraphImages(locale, "faq", ogAltForRoute("faq")),
    },
  };
}

function buildFaqPageJsonLd(
  items: { question: string; answer: string }[],
  locale: string,
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: locale === "ko" ? "ko-KR" : "en-US",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export default async function FaqPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const isKo = locale === "ko";

  const dbItems = await getPublicFaqs();
  const displayItems = isKo
    ? dbItems
    : dbItems.map((item) => {
        const catalog = FAQ_CATALOG.find(
          (c) => c.category === item.category && c.order === item.order,
        );
        return {
          ...item,
          question: catalog?.questionEn ?? item.question,
          answer: catalog?.answerEn ?? item.answer,
        };
      });

  const breadcrumb = buildBreadcrumbJsonLd(locale, [
    { name: isKo ? "홈" : "Home", path: "" },
    { name: isKo ? "옥외광고 FAQ" : "OOH FAQ", path: "/faq" },
  ]);

  const faqJsonLd = buildFaqPageJsonLd(displayItems, locale);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd([faqJsonLd, breadcrumb]),
        }}
      />

      <HomeLandingDayNight>
        <div className="tkad-landing-neon bg-gray-50 dark:bg-[#0A0A0A]">
          <PageHero
            eyebrow="// FAQ"
            title={isKo ? "옥외광고 " : "OOH "}
            highlight={isKo ? "자주 묻는 질문" : "FAQ"}
            description={
              isKo
                ? "단가·집행·팬덤 광고·효과 측정까지 궁금한 점을 빠르게 찾아보세요"
                : "Rates, execution, fandom ads, and measurement — find answers fast"
            }
          />
          <FaqPageClient items={displayItems} isKo={isKo} />
        </div>
      </HomeLandingDayNight>
    </>
  );
}

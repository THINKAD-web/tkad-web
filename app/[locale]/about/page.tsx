import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { pageAlternates, segmentOpenGraphImages } from "@/lib/seo";
import { ogAltForRoute } from "@/lib/og-route-copy";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { PageHero } from "@/components/layout/page-hero";
import { AboutPageSections } from "@/components/about/about-page-sections";
import { getPublicMediaCountLabel } from "@/lib/trust-metrics";

type Props = { params: Promise<{ locale: string }> };

const ABOUT_META_KO = {
  title: "회사소개 — 국내 최초 OOH 단가 투명화 | THINKAD 싱커드",
  description:
    "싱커드는 2014년부터 국내 최초로 옥외광고 단가를 투명하게 공개했습니다. " +
    "10년의 신뢰가 AI 플랫폼으로 진화합니다.",
  openGraphTitle: "싱커드 회사소개 — 국내 최초 OOH 단가 투명화",
  openGraphDescription: "2014년부터 시작된 OOH 광고 혁신의 이야기",
} as const;

const ABOUT_META_EN = {
  title: "About — Korea's first transparent OOH rates | THINKAD",
  description:
    "Since 2014, THINKAD has published OOH advertising rates transparently — " +
    "a decade of trust evolving into an AI platform.",
  openGraphTitle: "About THINKAD — transparent OOH rates since 2014",
  openGraphDescription: "The story of OOH innovation from 2014 to today",
} as const;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  const meta = isKo ? ABOUT_META_KO : ABOUT_META_EN;

  return {
    title: meta.title,
    description: meta.description,
    alternates: pageAlternates(locale, "/about"),
    openGraph: {
      title: meta.openGraphTitle,
      description: meta.openGraphDescription,
      images: segmentOpenGraphImages(locale, "about", ogAltForRoute("about")),
    },
    twitter: {
      card: "summary_large_image",
      title: meta.openGraphTitle,
      description: meta.description,
      images: segmentOpenGraphImages(locale, "about", ogAltForRoute("about")),
    },
  };
}

export default async function AboutPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const isKo = locale === "ko";
  const verifiedLabel = await getPublicMediaCountLabel("verified");

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-planner-neon bg-gray-50 dark:bg-[#0A0A0A]">
        <PageHero
          eyebrow="// ABOUT THINKAD"
          title={isKo ? "광고판을 " : "We made billboards "}
          highlight={isKo ? "투명하게" : "transparent"}
          titleEnd={isKo ? " 만든 회사" : ""}
          description={
            isKo
              ? "2014년부터 국내 최초로 OOH 단가를 공개해온 싱커드가 AI 플랫폼으로 진화합니다"
              : "Since 2014, THINKAD pioneered transparent OOH pricing in Korea — now evolving into an AI platform"
          }
        />
        <AboutPageSections isKo={isKo} verifiedLabel={verifiedLabel} />
      </div>
    </HomeLandingDayNight>
  );
}

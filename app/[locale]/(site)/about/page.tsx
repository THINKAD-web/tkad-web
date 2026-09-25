import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { pageAlternates, pageTitleKeyword, segmentOpenGraphImages } from "@/lib/seo";
import { ogAltForRoute } from "@/lib/og-route-copy";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { PageHero } from "@/components/layout/page-hero";
import { AboutPageSections } from "@/components/about/about-page-sections";
import { MarketingHeroVisual } from "@/components/design/marketing-hero-visual";
import { DESIGN_MARKETING_HERO_ASSETS } from "@/lib/design-marketing-assets";
import { getPublicMediaCountLabel } from "@/lib/trust-metrics";

type Props = { params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const t = await getTranslations({ locale, namespace: "about" });

  return {
    title: pageTitleKeyword(t("metaTitle")),
    description: t("metaDescription"),
    alternates: pageAlternates(locale, "/about"),
    openGraph: {
      title: t("metaOgTitle"),
      description: t("metaOgDescription"),
      images: segmentOpenGraphImages(locale, "about", ogAltForRoute("about")),
    },
    twitter: {
      card: "summary_large_image",
      title: t("metaOgTitle"),
      description: t("metaDescription"),
      images: segmentOpenGraphImages(locale, "about", ogAltForRoute("about")),
    },
  };
}

export default async function AboutPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const t = await getTranslations("about");
  const verifiedLabel = await getPublicMediaCountLabel("verified");

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-planner-neon bg-gray-50 dark:bg-[#0A0A0A]">
        <PageHero
          eyebrow={t("heroEyebrow")}
          title={t("heroSlogan")}
          highlight=""
          description={t("identityBody")}
        />
        <MarketingHeroVisual
          src={DESIGN_MARKETING_HERO_ASSETS.brandStory}
          className="pb-6 pt-2"
        />
        <AboutPageSections verifiedLabel={verifiedLabel} />
      </div>
    </HomeLandingDayNight>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";
import {
  getSpecialLandingConfig,
  KNOWN_SPECIAL_SLUGS,
  specialLandingMetadata,
} from "@/lib/special-media-landings";
import { pageAlternates } from "@/lib/seo";
import {
  buildBreadcrumbJsonLd,
  buildMediaCatalogItemListJsonLd,
} from "@/lib/structured-data";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { SpecialLandingHero } from "@/components/special/special-landing-hero";
import {
  SpecialBottomCta,
  SpecialFaqSection,
  SpecialGuideSection,
  SpecialMapSection,
  SpecialMediaGridSection,
} from "@/components/special/special-landing-sections";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateStaticParams() {
  return KNOWN_SPECIAL_SLUGS.flatMap((slug) => [
    { locale: "ko", slug },
    { locale: "en", slug },
  ]);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = await resolveLocaleParam(Promise.resolve({ locale: rawLocale }));
  const config = getSpecialLandingConfig(decodeURIComponent(slug));
  if (!config) return { title: "Not found" };
  return {
    ...specialLandingMetadata(config, locale),
    alternates: pageAlternates(locale, `/special/${slug}`),
  };
}

export default async function SpecialLandingPage({ params }: Props) {
  const { locale: rawLocale, slug } = await params;
  const locale = await resolveLocaleParam(Promise.resolve({ locale: rawLocale }));
  setRequestLocale(locale);
  const decoded = decodeURIComponent(slug);
  const config = getSpecialLandingConfig(decoded);
  if (!config) notFound();

  const isKo = locale.startsWith("ko");
  let catalog: Awaited<ReturnType<typeof fetchPublicMediaCatalog>> = [];
  try {
    catalog = await fetchPublicMediaCatalog();
  } catch {
    /* empty */
  }

  const mediaItems = config.filterMedia(catalog, 12);

  const itemListLd = buildMediaCatalogItemListJsonLd(
    locale,
    mediaItems.map((m) => ({
      id: m.id,
      name: m.name,
      nameEn: m.nameEn,
      location: m.location,
      locationEn: m.locationEn,
    })),
    12,
  );
  const breadcrumbLd = buildBreadcrumbJsonLd(locale, [
    { name: isKo ? "홈" : "Home", path: "" },
    { name: isKo ? "특별 매체" : "Special media", path: "/media" },
    { name: isKo ? "팬덤 광고" : "Fandom ads", path: `/special/${slug}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([itemListLd, breadcrumbLd]),
        }}
      />
      <HomeLandingDayNight>
        <div className="tkad-landing-neon tkad-media-page">
          <SpecialLandingHero
            eyebrow={isKo ? config.eyebrowKo : config.eyebrowEn}
            headlineBefore={isKo ? config.headlineBeforeKo : config.headlineBeforeEn}
            headlineGradient={
              isKo ? config.headlineGradientKo : config.headlineGradientEn
            }
            headlineAfter={
              isKo ? config.headlineAfterKo : config.headlineAfterEn
            }
            subtitle={isKo ? config.subtitleKo : config.subtitleEn}
            icon={config.icon}
            primaryCta={{
              href: config.primaryCtaHref,
              label: isKo ? config.primaryCtaKo : config.primaryCtaEn,
            }}
            secondaryCta={{
              href: config.secondaryCtaHref,
              label: isKo ? config.secondaryCtaKo : config.secondaryCtaEn,
            }}
          />

          <SpecialMediaGridSection
            title={isKo ? config.mediaSectionTitleKo : config.mediaSectionTitleEn}
            items={mediaItems}
            locale={locale}
            emptyMessage={
              isKo
                ? "팬덤 광고 매체를 준비 중입니다."
                : "Fandom media listings coming soon."
            }
            ctaHref={config.primaryCtaHref}
            ctaLabel={isKo ? config.primaryCtaKo : config.primaryCtaEn}
          />

          <SpecialMapSection
            title={isKo ? config.mapSectionTitleKo : config.mapSectionTitleEn}
            hotspots={config.hotspots}
            isKo={isKo}
          />

          <SpecialGuideSection
            title={isKo ? config.guideSectionTitleKo : config.guideSectionTitleEn}
            steps={config.guideSteps}
            isKo={isKo}
          />

          <SpecialFaqSection
            title={isKo ? config.faqSectionTitleKo : config.faqSectionTitleEn}
            items={config.faq}
            isKo={isKo}
          />

          <SpecialBottomCta isKo={isKo} href={config.secondaryCtaHref} />
        </div>
      </HomeLandingDayNight>
    </>
  );
}

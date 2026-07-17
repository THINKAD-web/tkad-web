import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";
import { getPublishedSuccessCases } from "@/lib/public-content-queries";
import {
  filterCasesForIndustry,
  filterMediaForIndustry,
  INDUSTRY_SLUGS,
  isIndustrySlug,
  type IndustrySlug,
} from "@/lib/industry-landing";
import { buildShareMetadata, pageAlternates } from "@/lib/seo";
import {
  buildBreadcrumbJsonLd,
  buildMediaCatalogItemListJsonLd,
} from "@/lib/structured-data";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { MediaKeywordLandingHero } from "@/components/media-keyword-landing-hero";
import { HomeMediaGridServer } from "@/components/home/home-media-grid-server";
import { NeonSection } from "@/components/landing/neon/neon-section";
import { NeonSectionHead } from "@/components/landing/neon/neon-section-head";
import { accentTag } from "@/lib/render-accent-title";
import { CaseStudyCard } from "@/components/cases/case-study-card";
import { IndustryMediaTypes } from "@/components/industry/industry-media-types";
import { IndustryBudgetCalculator } from "@/components/industry/industry-budget-calculator";
import { IndustryFaq } from "@/components/industry/industry-faq";
import { IndustryOtherLinks } from "@/components/industry/industry-other-links";
import { IndustryPackageLinks } from "@/components/industry/industry-package-links";
import { deferCatalogLandingStaticGeneration } from "@/lib/vercel-static-build";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export const revalidate = 3600;
export const dynamicParams = true;

export function generateStaticParams() {
  if (deferCatalogLandingStaticGeneration()) return [];
  return routing.locales.flatMap((locale) =>
    INDUSTRY_SLUGS.map((slug) => ({ locale, slug })),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = await resolveLocaleParam(Promise.resolve({ locale: rawLocale }));
  if (!isIndustrySlug(slug)) {
    return { title: "THINKAD" };
  }

  const t = await getTranslations({
    locale,
    namespace: `industryPage.slugs.${slug}`,
  });

  const title = t("metaTitle");
  const description = t("metaDescription");

  return {
    title,
    description,
    alternates: pageAlternates(locale, `/industry/${slug}`),
    ...buildShareMetadata({
      locale,
      title,
      description,
      path: `/industry/${slug}`,
      image: { kind: "segment", segment: "media" },
    }),
  };
}

export default async function IndustryLandingPage({ params }: Props) {
  const { locale: rawLocale, slug: rawSlug } = await params;
  const locale = await resolveLocaleParam(Promise.resolve({ locale: rawLocale }));
  setRequestLocale(locale);

  const decoded = decodeURIComponent(rawSlug);
  if (!isIndustrySlug(decoded)) {
    notFound();
  }
  const slug: IndustrySlug = decoded;
  const isKo = locale === "ko";

  const t = await getTranslations(`industryPage.slugs.${slug}`);

  let catalog: Awaited<ReturnType<typeof fetchPublicMediaCatalog>> = [];
  try {
    catalog = await fetchPublicMediaCatalog();
  } catch {
    /* empty */
  }

  const mediaItems = filterMediaForIndustry(catalog, slug, 12);
  const priceRefs = catalog.map((m) => ({ id: m.id, price: m.price }));

  const cases = await getPublishedSuccessCases(locale);
  const industryCases = filterCasesForIndustry(cases, slug, 3);

  const heroTitle = t("heroTitle");
  const heroSubtitle = `${t("heroTarget")} ${t("heroReason")}`;

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
    {
      name: isKo ? "업종별 OOH 가이드" : "Industry guides",
      path: "/industry/beauty",
    },
    { name: t("navLabel"), path: `/industry/${slug}` },
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
        <div className="tkad-landing-neon tkad-planner-neon">
          <MediaKeywordLandingHero
            tone="qp"
            eyebrow={`// ${isKo ? "업종별 OOH" : "INDUSTRY OOH"}`}
            title={heroTitle}
            description={heroSubtitle}
            icon={<Sparkles className="size-7 dark:text-white text-gray-800" aria-hidden />}
            primaryCta={{
              href: "/contact",
              label: t("ctaConsult"),
            }}
            secondaryCta={{
              href: "/media",
              label: isKo ? "매체 둘러보기" : "Browse media",
            }}
            showBeta={false}
          />

          <IndustryMediaTypes slug={slug} locale={locale} />

          <NeonSection tone="qp" className="pt-4 pb-12 sm:pb-16">
            <NeonSectionHead
              number="02"
              kicker={t("mediaGridKicker")}
              title={t.rich("mediaGridTitle", { accent: accentTag })}
              meta={t("mediaGridMeta", { count: mediaItems.length })}
            />
            {mediaItems.length === 0 ? (
              <p className="mt-8 text-center text-sm dark:text-white text-gray-500">
                {t("mediaGridEmpty")}
              </p>
            ) : (
              <div className="mt-8">
                <HomeMediaGridServer items={mediaItems} locale={locale} />
                <div className="mt-8 text-center">
                  <Link
                    href="/media"
                    className="tkad-qp-cta inline-flex h-12 items-center justify-center rounded-[18px] px-8 text-sm font-black dark:text-white text-gray-900"
                  >
                    {isKo ? "전체 매체 보기" : "View all media"}
                  </Link>
                </div>
              </div>
            )}
          </NeonSection>

          {industryCases.length > 0 ? (
            <NeonSection tone="qp" className="pt-4 pb-12 sm:pb-16">
              <NeonSectionHead
                number="—"
                kicker={t("casesKicker")}
                title={t.rich("casesTitle", { accent: accentTag })}
                meta={t("casesMeta")}
              />
              <ul className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
                {industryCases.map((c) => (
                  <li key={c.id} className="list-none">
                    <CaseStudyCard item={c} compact />
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-center">
                <Link
                  href="/cases"
                  className="font-display text-xs font-medium uppercase tracking-[0.18em] dark:text-white text-gray-600 underline-offset-4 hover:dark:text-white text-gray-900 hover:underline"
                >
                  {isKo ? "성공 사례 더보기" : "More success stories"}
                </Link>
              </p>
            </NeonSection>
          ) : null}

          <IndustryBudgetCalculator slug={slug} priceRefs={priceRefs} />

          <IndustryFaq slug={slug} />

          <IndustryPackageLinks slug={slug} locale={locale} />

          <IndustryOtherLinks slug={slug} locale={locale} />
        </div>
      </HomeLandingDayNight>
    </>
  );
}

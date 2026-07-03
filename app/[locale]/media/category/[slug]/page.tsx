import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";
import {
  categoryHeroTitle,
  categoryLandingDescription,
  categoryLandingTitle,
  filterCatalogByCategorySlug,
  KNOWN_MEDIA_CATEGORY_SLUGS,
  mediaMatchesCategorySlug,
} from "@/lib/media-category-landing";
import { categoryLabel, getMediaCategoryBySlug } from "@/lib/media-categories";
import {
  buildBreadcrumbJsonLd,
  buildMediaCatalogItemListJsonLd,
} from "@/lib/structured-data";
import { buildShareMetadata, pageAlternates, pageAlternatesForCanonical } from "@/lib/seo";
import {
  categoryLandingCanonicalPath,
  categoryLandingUsesExternalCanonical,
} from "@/lib/seo-canonical-landings";
import { MediaKeywordLandingHero } from "@/components/media-keyword-landing-hero";
import { MediaKeywordLandingEmpty } from "@/components/media-keyword-landing-empty";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import {
  CategoryLandingCta,
  CategoryLandingInsights,
  CategoryLandingMediaGrid,
} from "@/components/media-category-landing-sections";
import { Layers } from "lucide-react";
import { deferCatalogLandingStaticGeneration } from "@/lib/vercel-static-build";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  if (deferCatalogLandingStaticGeneration()) return [];
  return KNOWN_MEDIA_CATEGORY_SLUGS.flatMap((slug) => [
    { locale: "ko", slug },
    { locale: "en", slug },
  ]);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = await resolveLocaleParam(Promise.resolve({ locale: rawLocale }));
  const decoded = decodeURIComponent(slug);
  const node = getMediaCategoryBySlug(decoded);
  if (!node) return { title: "Not found" };

  let count = 0;
  try {
    const catalog = await fetchPublicMediaCatalog();
    count = catalog.filter((m) => mediaMatchesCategorySlug(m, decoded)).length;
  } catch {
    /* ignore */
  }

  const title = categoryLandingTitle(decoded, locale, count);
  const description = categoryLandingDescription(decoded, locale, count);
  const keywords = node.seoKeywordsKo ?? [];
  const canonicalPath = categoryLandingCanonicalPath(decoded);
  const alternates = categoryLandingUsesExternalCanonical(decoded)
    ? pageAlternatesForCanonical(locale, canonicalPath)
    : pageAlternates(locale, `/media/category/${slug}`);

  return {
    title,
    description,
    keywords: locale.startsWith("ko")
      ? [...keywords, "옥외광고", "THINKAD", "싱커드"]
      : ["OOH", "outdoor advertising", "THINKAD", decoded],
    alternates,
    ...buildShareMetadata({
      locale,
      title,
      description,
      path: `/media/category/${slug}`,
      image: { kind: "segment", segment: "media" },
    }),
  };
}

export default async function MediaCategoryLandingPage({ params }: Props) {
  const { locale: rawLocale, slug } = await params;
  const locale = await resolveLocaleParam(Promise.resolve({ locale: rawLocale }));
  setRequestLocale(locale);
  const decoded = decodeURIComponent(slug);
  const node = getMediaCategoryBySlug(decoded);
  if (!node) notFound();

  const isKo = locale.startsWith("ko");
  let catalog: Awaited<ReturnType<typeof fetchPublicMediaCatalog>> = [];
  try {
    catalog = await fetchPublicMediaCatalog();
  } catch {
    /* empty */
  }

  const filtered = catalog.filter((m) => mediaMatchesCategorySlug(m, decoded));
  const gridItems = filterCatalogByCategorySlug(catalog, decoded, 12);
  const label = categoryLabel(decoded, locale);
  const title = categoryHeroTitle(decoded, locale, filtered.length);
  const description =
    (isKo ? node.heroSubtitleKo : node.heroSubtitleEn) ??
    (isKo ? node.descriptionKo : node.descriptionEn) ??
    categoryLandingDescription(decoded, locale, filtered.length);

  const itemListLd = buildMediaCatalogItemListJsonLd(
    locale,
    gridItems.map((m) => ({
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
    { name: isKo ? "옥외광고 매체" : "OOH media", path: "/media" },
    { name: label, path: `/media/category/${slug}` },
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
          <MediaKeywordLandingHero
            eyebrow={`// ${isKo ? "매체 카테고리" : "MEDIA CATEGORY"}`}
            title={title}
            description={description}
            icon={
              <span className="text-2xl" aria-hidden>
                {node.icon ?? "📍"}
              </span>
            }
            primaryCta={{
              href: `/media?cat=${decoded}`,
              label: isKo ? `${label} 매체 보기` : `Browse ${label}`,
            }}
            secondaryCta={{
              href: "/contact",
              label: isKo ? "견적 문의" : "Get a quote",
            }}
          />

          {gridItems.length === 0 ? (
            <MediaKeywordLandingEmpty
              message={
                isKo
                  ? `현재 ${label} 카테고리 매체가 없습니다.`
                  : `No ${label} media in catalog yet.`
              }
              ctaLabel={isKo ? "전체 매체 보기" : "Browse all media"}
            />
          ) : (
            <CategoryLandingMediaGrid
              items={gridItems}
              locale={locale}
              title={
                isKo
                  ? `추천 ${label} 매체 ${gridItems.length}개`
                  : `Recommended ${label} media`
              }
            />
          )}

          <CategoryLandingInsights locale={locale} slug={decoded} kind="media" />
          <CategoryLandingCta
            locale={locale}
            slug={decoded}
            kind="media"
            label={label}
          />

          <section className="border-t border-border/80 py-10">
            <div className="ui-container">
              <p className="text-xs font-semibold text-muted-foreground">
                {isKo ? "다른 카테고리" : "Other categories"}
              </p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {KNOWN_MEDIA_CATEGORY_SLUGS.filter((s) => s !== decoded)
                  .slice(0, 12)
                  .map((s) => (
                    <li key={s}>
                      <Link
                        href={`/media/category/${s}`}
                        className="inline-flex rounded-2xl border border-border bg-card px-4 py-2 text-sm font-medium hover:border-accent"
                      >
                        {categoryLabel(s, locale)}
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
          </section>
        </div>
      </HomeLandingDayNight>
    </>
  );
}

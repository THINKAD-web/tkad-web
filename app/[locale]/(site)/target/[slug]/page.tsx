import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { fetchPublicMediaCatalogList } from "@/lib/public-media-catalog";
import {
  filterCatalogByTargetSlug,
  KNOWN_TARGET_SLUGS,
  mediaMatchesTargetSlug,
  targetHeroTitle,
  targetLandingDescription,
  targetLandingTitle,
} from "@/lib/media-category-landing";
import { getTargetCategoryBySlug, targetLabel } from "@/lib/media-categories";
import {
  buildBreadcrumbJsonLd,
  buildMediaCatalogItemListJsonLd,
} from "@/lib/structured-data";
import { buildShareMetadata, pageAlternates } from "@/lib/seo";
import { MediaKeywordLandingHero } from "@/components/media-keyword-landing-hero";
import { MediaKeywordLandingEmpty } from "@/components/media-keyword-landing-empty";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import {
  CategoryLandingCta,
  CategoryLandingInsights,
  CategoryLandingMediaGrid,
  TargetLandingGuide,
} from "@/components/media-category-landing-sections";
import { Target } from "lucide-react";
import { deferCatalogLandingStaticGeneration } from "@/lib/vercel-static-build";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export const revalidate = 21600;
export const dynamicParams = true;

export async function generateStaticParams() {
  if (deferCatalogLandingStaticGeneration()) return [];
  return KNOWN_TARGET_SLUGS.flatMap((slug) => [
    { locale: "ko", slug },
    { locale: "en", slug },
  ]);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = await resolveLocaleParam(Promise.resolve({ locale: rawLocale }));
  const decoded = decodeURIComponent(slug);
  const node = getTargetCategoryBySlug(decoded);
  if (!node) return { title: "Not found" };

  let count = 0;
  try {
    const catalog = await fetchPublicMediaCatalogList();
    count = catalog.filter((m) => mediaMatchesTargetSlug(m, decoded)).length;
  } catch {
    /* ignore */
  }

  const title = targetLandingTitle(decoded, locale, count);
  const description = targetLandingDescription(decoded, locale, count);

  return {
    title,
    description,
    keywords: locale.startsWith("ko")
      ? [...(node.seoKeywordsKo ?? []), "옥외광고", "THINKAD"]
      : ["OOH", "THINKAD", decoded],
    alternates: pageAlternates(locale, `/target/${slug}`),
    ...buildShareMetadata({
      locale,
      title,
      description,
      path: `/target/${slug}`,
      image: { kind: "segment", segment: "media" },
    }),
  };
}

export default async function TargetLandingPage({ params }: Props) {
  const { locale: rawLocale, slug } = await params;
  const locale = await resolveLocaleParam(Promise.resolve({ locale: rawLocale }));
  setRequestLocale(locale);
  const decoded = decodeURIComponent(slug);
  const node = getTargetCategoryBySlug(decoded);
  if (!node) notFound();

  const isKo = locale.startsWith("ko");
  let catalog: Awaited<ReturnType<typeof fetchPublicMediaCatalogList>> = [];
  try {
    catalog = await fetchPublicMediaCatalogList();
  } catch {
    /* empty */
  }

  const filtered = catalog.filter((m) => mediaMatchesTargetSlug(m, decoded));
  const gridItems = filterCatalogByTargetSlug(catalog, decoded, 10);
  const label = targetLabel(decoded, locale);
  const title = targetHeroTitle(decoded, locale);
  const description = targetLandingDescription(decoded, locale, filtered.length);

  const itemListLd = buildMediaCatalogItemListJsonLd(
    locale,
    gridItems.map((m) => ({
      id: m.id,
      name: m.name,
      nameEn: m.nameEn,
      location: m.location,
      locationEn: m.locationEn,
    })),
    10,
  );
  const breadcrumbLd = buildBreadcrumbJsonLd(locale, [
    { name: isKo ? "홈" : "Home", path: "" },
    { name: isKo ? "캠페인 목적" : "Campaign goals", path: "/media" },
    { name: label, path: `/target/${slug}` },
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
            eyebrow={`// ${isKo ? "캠페인 목적" : "CAMPAIGN GOAL"}`}
            title={title}
            description={description}
            icon={
              <span className="text-2xl" aria-hidden>
                {node.icon ?? <Target className="size-7" />}
              </span>
            }
            primaryCta={{
              href: `/media?target=${decoded}`,
              label: isKo ? `${label} 매체 보기` : `Browse for ${label}`,
            }}
            secondaryCta={{
              href: "/recommend",
              label: isKo ? "AI 추천" : "AI recommend",
            }}
          />

          {gridItems.length === 0 ? (
            <MediaKeywordLandingEmpty
              message={
                isKo
                  ? `${label}에 적합한 매체가 아직 없습니다.`
                  : `No media tagged for ${label} yet.`
              }
              ctaLabel={isKo ? "전체 매체 보기" : "Browse all media"}
            />
          ) : (
            <CategoryLandingMediaGrid
              items={gridItems}
              locale={locale}
              title={
                isKo
                  ? `${label} 인기 매체 TOP ${gridItems.length}`
                  : `Top ${label} media`
              }
            />
          )}

          <TargetLandingGuide locale={locale} slug={decoded} />
          <CategoryLandingInsights locale={locale} slug={decoded} kind="target" />
          <CategoryLandingCta
            locale={locale}
            slug={decoded}
            kind="target"
            label={label}
          />

          <section className="border-t border-border/80 py-10">
            <div className="ui-container">
              <p className="tkad-type-title text-muted-foreground">
                {isKo ? "다른 캠페인 목적" : "Other goals"}
              </p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {KNOWN_TARGET_SLUGS.filter((s) => s !== decoded).map((s) => (
                  <li key={s}>
                    <Link
                      href={`/target/${s}`}
                      className="inline-flex rounded-2xl border border-border bg-card px-4 py-2 text-sm font-medium hover:border-accent"
                    >
                      {targetLabel(s, locale)}
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

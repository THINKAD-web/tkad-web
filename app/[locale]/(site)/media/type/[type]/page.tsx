import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { fetchPublicMediaCatalogList } from "@/lib/public-media-catalog";
import {
  KNOWN_TYPE_SLUGS,
  typeLabel,
  typeLandingDescription,
  typeLandingTitle,
} from "@/lib/media-keyword-landing";
import {
  buildBreadcrumbJsonLd,
  buildMediaCatalogItemListJsonLd,
} from "@/lib/structured-data";
import { buildShareMetadata, pageAlternates, pageAlternatesForCanonical } from "@/lib/seo";
import {
  technicalTypeLandingCanonicalPath,
  technicalTypeLandingUsesExternalCanonical,
} from "@/lib/seo-canonical-landings";
import { MediaKeywordLandingCatalog } from "@/components/media-keyword-landing-catalog";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { MediaKeywordLandingHero } from "@/components/media-keyword-landing-hero";
import { MediaKeywordLandingEmpty } from "@/components/media-keyword-landing-empty";
import { Layers } from "lucide-react";

type Props = {
  params: Promise<{ locale: string; type: string }>;
};

/**
 * `/[locale]/media/type/[type]` — 매체 유형별 OOH 매체 키워드 랜딩.
 *
 * 운영 안전: DB(`fetchPublicMediaCatalogList`) 가 source of truth, 콘텐츠는 텍스트
 * 템플릿 (AI 생성 X), 알 수 없는 슬러그 + 0건 → notFound.
 */

export const revalidate = 21600;
export const dynamicParams = true;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale, type } = await params;
  const locale = await resolveLocaleParam(Promise.resolve({ locale: rawLocale }));
  const decodedType = decodeURIComponent(type);

  let count = 0;
  try {
    const catalog = await fetchPublicMediaCatalogList();
    count = catalog.filter((m) => m.type === decodedType).length;
  } catch {
    /* 카탈로그 실패 시 count=0 */
  }

  const title = typeLandingTitle(decodedType, locale, count);
  const description = typeLandingDescription(decodedType, locale, count);
  const label = typeLabel(decodedType, locale);
  const canonicalPath = technicalTypeLandingCanonicalPath(decodedType);
  const alternates = technicalTypeLandingUsesExternalCanonical(decodedType)
    ? pageAlternatesForCanonical(locale, canonicalPath)
    : pageAlternates(locale, `/media/type/${type}`);

  return {
    title,
    description,
    keywords: locale === "ko"
      ? [
          `${label}`,
          `${label} 광고`,
          `${label} 매체`,
          `OOH ${label}`,
          "옥외광고",
          "THINKAD",
          "싱커드",
        ]
      : [
          `${label}`,
          `OOH ${label.toLowerCase()}`,
          "Korea OOH",
          "outdoor advertising",
          "THINKAD",
        ],
    alternates,
    ...buildShareMetadata({
      locale,
      title,
      description,
      path: `/media/type/${type}`,
      image: { kind: "segment", segment: "media" },
    }),
  };
}

export default async function TypeLandingPage({ params }: Props) {
  const { locale: rawLocale, type } = await params;
  const locale = await resolveLocaleParam(Promise.resolve({ locale: rawLocale }));
  setRequestLocale(locale);

  const decodedType = decodeURIComponent(type);
  const isKo = locale === "ko";

  let catalog: Awaited<ReturnType<typeof fetchPublicMediaCatalogList>> = [];
  try {
    catalog = await fetchPublicMediaCatalogList();
  } catch {
    /* 빈 카탈로그 */
  }

  const filtered = catalog.filter((m) => m.type === decodedType);

  if (filtered.length === 0 && !KNOWN_TYPE_SLUGS.includes(decodedType)) {
    notFound();
  }

  const label = typeLabel(decodedType, locale);
  const title = typeLandingTitle(decodedType, locale, filtered.length);
  const description = typeLandingDescription(decodedType, locale, filtered.length);

  const itemListLd = buildMediaCatalogItemListJsonLd(
    locale,
    filtered.map((m) => ({
      id: m.id,
      name: m.name,
      nameEn: m.nameEn,
      location: m.location,
      locationEn: m.locationEn,
    })),
    50,
  );
  const breadcrumbLd = buildBreadcrumbJsonLd(locale, [
    { name: isKo ? "홈" : "Home", path: "" },
    { name: isKo ? "옥외광고 매체" : "OOH media", path: "/media" },
    { name: label, path: `/media/type/${type}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([itemListLd, breadcrumbLd]) }}
      />

      <HomeLandingDayNight>
        <div className="tkad-landing-neon tkad-planner-neon">
          <MediaKeywordLandingHero
            tone="qp"
            eyebrow={`// ${isKo ? "유형별 매체" : "BY TYPE"}`}
            title={title}
            description={description}
            icon={<Layers className="size-7 dark:text-white text-gray-800" aria-hidden />}
            primaryCta={{
              href: "/media",
              label: isKo ? "전체 매체 보기" : "All media",
            }}
            secondaryCta={{
              href: "/recommend",
              label: isKo ? "AI 매체 추천" : "AI recommendations",
            }}
          />

          {filtered.length === 0 ? (
            <MediaKeywordLandingEmpty
              message={
                isKo
                  ? `현재 ${label} 유형의 매체가 없습니다.`
                  : `No ${label.toLowerCase()} media currently available.`
              }
              ctaLabel={isKo ? "전체 매체 보기" : "Browse all media"}
            />
          ) : (
            <MediaKeywordLandingCatalog items={filtered} locale={locale} />
          )}

          <section className="tkad-media-links-footer border-t border-border/80 bg-muted py-12 text-foreground sm:py-16">
            <div className="ui-container">
              <p className="tkad-type-title text-muted-foreground sm:text-sm">
                {isKo ? "다른 유형으로 찾기" : "Browse other formats"}
              </p>
              <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                {isKo ? "OOH 매체 유형" : "OOH media types"}
              </h2>
              <ul className="mt-5 flex flex-wrap gap-2">
                {KNOWN_TYPE_SLUGS.filter((s) => s !== decodedType).map(
                  (slug) => (
                    <li key={slug}>
                      <Link
                        href={`/media/type/${slug}`}
                        className="inline-flex items-center gap-1.5 rounded-2xl border-2 border-border bg-card px-4 py-2.5 text-sm font-medium text-card-foreground shadow-xs transition-colors hover:border-accent hover:bg-muted"
                      >
                        {typeLabel(slug, locale)}
                      </Link>
                    </li>
                  ),
                )}
              </ul>
            </div>
          </section>
        </div>
      </HomeLandingDayNight>
    </>
  );
}

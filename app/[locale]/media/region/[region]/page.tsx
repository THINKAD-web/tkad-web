import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";
import {
  KNOWN_REGION_SLUGS,
  regionLabel,
  regionLandingDescription,
  regionLandingTitle,
} from "@/lib/media-keyword-landing";
import {
  buildBreadcrumbJsonLd,
  buildMediaCatalogItemListJsonLd,
} from "@/lib/structured-data";
import { buildShareMetadata, pageAlternates } from "@/lib/seo";
import { MediaKeywordLandingCatalog } from "@/components/media-keyword-landing-catalog";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { MediaKeywordLandingHero } from "@/components/media-keyword-landing-hero";
import { MediaKeywordLandingEmpty } from "@/components/media-keyword-landing-empty";
import { MapPin } from "lucide-react";

type Props = {
  params: Promise<{ locale: string; region: string }>;
};

/**
 * `/[locale]/media/region/[region]` — 지역별 OOH 매체 키워드 랜딩.
 *
 * 운영 안전:
 *   - DB(`fetchPublicMediaCatalog`) 가 source of truth — mock 데이터 사용 X
 *   - 알 수 없는 region 슬러그 → 카탈로그에 매체 0건이면 notFound() (soft 404 회피)
 *   - SEO 콘텐츠는 텍스트 템플릿 (AI 생성 X)
 */

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale, region } = await params;
  const locale = await resolveLocaleParam(Promise.resolve({ locale: rawLocale }));
  const decodedRegion = decodeURIComponent(region);

  let count = 0;
  try {
    const catalog = await fetchPublicMediaCatalog();
    count = catalog.filter((m) => m.region === decodedRegion).length;
  } catch {
    /* 카탈로그 실패 시 count=0 — metadata 만 반환 */
  }

  const title = regionLandingTitle(decodedRegion, locale, count);
  const description = regionLandingDescription(decodedRegion, locale, count);
  const label = regionLabel(decodedRegion, locale);

  return {
    title,
    description,
    keywords: locale === "ko"
      ? [
          `${label} 옥외광고`,
          `${label} OOH`,
          `${label} 빌보드`,
          `${label} 디지털 사이니지`,
          `${label} 광고 매체`,
          "THINKAD",
          "싱커드",
        ]
      : [
          `${label} OOH advertising`,
          `${label} billboard`,
          `${label} digital signage`,
          "Korea OOH",
          "THINKAD",
        ],
    alternates: pageAlternates(locale, `/media/region/${region}`),
    ...buildShareMetadata({
      locale,
      title,
      description,
      path: `/media/region/${region}`,
      image: { kind: "segment", segment: "media" },
    }),
  };
}

export default async function RegionLandingPage({ params }: Props) {
  const { locale: rawLocale, region } = await params;
  const locale = await resolveLocaleParam(Promise.resolve({ locale: rawLocale }));
  setRequestLocale(locale);

  const decodedRegion = decodeURIComponent(region);
  const isKo = locale === "ko";

  let catalog: Awaited<ReturnType<typeof fetchPublicMediaCatalog>> = [];
  try {
    catalog = await fetchPublicMediaCatalog();
  } catch {
    /* DB 미설정 등 — 빈 카탈로그로 notFound */
  }

  const filtered = catalog.filter((m) => m.region === decodedRegion);

  // 알려진 슬러그 OR 카탈로그에 매체가 있는 경우만 렌더. 둘 다 아니면 404.
  if (filtered.length === 0 && !KNOWN_REGION_SLUGS.includes(decodedRegion)) {
    notFound();
  }

  const label = regionLabel(decodedRegion, locale);
  const title = regionLandingTitle(decodedRegion, locale, filtered.length);
  const description = regionLandingDescription(decodedRegion, locale, filtered.length);

  // JSON-LD
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
    { name: label, path: `/media/region/${region}` },
  ]);

  const mapRegionHref = `/media/map?region=${encodeURIComponent(decodedRegion)}`;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([itemListLd, breadcrumbLd]) }}
      />

      <HomeLandingDayNight>
        <div className="tkad-landing-neon tkad-planner-neon tkad-media-page">
          <MediaKeywordLandingHero
            eyebrow={`// ${isKo ? "지역별 매체" : "BY REGION"}`}
            title={title}
            description={description}
            icon={<MapPin className="size-7 dark:text-white text-gray-800" aria-hidden />}
            primaryCta={{
              href: "/media",
              label: isKo ? "전체 매체 보기" : "All media",
            }}
            secondaryCta={{
              href: mapRegionHref,
              label: isKo ? "지도에서 보기" : "View on map",
            }}
          />

          {filtered.length === 0 ? (
            <MediaKeywordLandingEmpty
              message={
                isKo
                  ? `현재 ${label} 지역에 등록된 매체가 없습니다.`
                  : `No media currently registered in ${label}.`
              }
              ctaLabel={isKo ? "전체 매체 보기" : "Browse all media"}
            />
          ) : (
            <MediaKeywordLandingCatalog items={filtered} locale={locale} />
          )}

          <section className="tkad-media-links-footer border-t border-border/80 bg-muted py-12 text-foreground sm:py-16">
            <div className="ui-container">
              <p className="text-xs font-semibold text-muted-foreground sm:text-sm">
                {isKo ? "다른 지역에서 찾기" : "Browse other regions"}
              </p>
              <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                {isKo ? "전국 주요 광역" : "Major regions"}
              </h2>
              <ul className="mt-5 flex flex-wrap gap-2">
                {KNOWN_REGION_SLUGS.filter((s) => s !== decodedRegion).map(
                  (slug) => (
                    <li key={slug}>
                      <Link
                        href={`/media/region/${slug}`}
                        className="inline-flex items-center gap-1.5 rounded-2xl border-2 border-border bg-card px-4 py-2.5 text-sm font-medium text-card-foreground shadow-xs transition-colors hover:border-accent hover:bg-muted"
                      >
                        {regionLabel(slug, locale)}
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

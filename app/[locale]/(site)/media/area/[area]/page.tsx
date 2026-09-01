import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { fetchPublicMediaCatalogList } from "@/lib/public-media-catalog";
import {
  areaLabel,
  areaLandingDescription,
  areaLandingTitle,
} from "@/lib/media-keyword-landing";
import {
  buildBreadcrumbJsonLd,
  buildMediaCatalogItemListJsonLd,
} from "@/lib/structured-data";
import { buildShareMetadata, pageAlternates } from "@/lib/seo";
import { MediaKeywordLandingCatalog } from "@/components/media-keyword-landing-catalog";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { MediaKeywordLandingHero } from "@/components/media-keyword-landing-hero";
import { MapPin } from "lucide-react";

type Props = {
  params: Promise<{ locale: string; area: string }>;
};

/**
 * `/[locale]/media/area/[area]` — district(시·군·구) 단위 키워드 랜딩.
 *
 * 매칭: m.district === decoded slug (1순위). 없으면 m.city === decoded.
 * 콘텐츠: 텍스트 템플릿 (AI 자동 생성 X).
 * 운영 안전: DB(fetchPublicMediaCatalogList) source of truth. 0건이면 notFound.
 */

export const dynamic = "force-dynamic";

function matchArea(
  m: { city?: string; district?: string },
  decodedArea: string,
): boolean {
  return m.district === decodedArea || m.city === decodedArea;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale, area } = await params;
  const locale = await resolveLocaleParam(Promise.resolve({ locale: rawLocale }));
  const decodedArea = decodeURIComponent(area);

  let count = 0;
  try {
    const catalog = await fetchPublicMediaCatalogList();
    count = catalog.filter((m) => matchArea(m, decodedArea)).length;
  } catch {
    /* fall through */
  }

  const title = areaLandingTitle(decodedArea, locale, count);
  const description = areaLandingDescription(decodedArea, locale, count);
  const label = areaLabel(decodedArea, locale);

  return {
    title,
    description,
    keywords: locale === "ko"
      ? [
          `${label} 옥외광고`,
          `${label} OOH`,
          `${label} 빌보드`,
          `${label} 디지털 사이니지`,
          `${label} 광고`,
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
    alternates: pageAlternates(locale, `/media/area/${area}`),
    ...buildShareMetadata({
      locale,
      title,
      description,
      path: `/media/area/${area}`,
      image: { kind: "segment", segment: "media" },
    }),
  };
}

export default async function AreaLandingPage({ params }: Props) {
  const { locale: rawLocale, area } = await params;
  const locale = await resolveLocaleParam(Promise.resolve({ locale: rawLocale }));
  setRequestLocale(locale);

  const decodedArea = decodeURIComponent(area);
  const isKo = locale === "ko";

  let catalog: Awaited<ReturnType<typeof fetchPublicMediaCatalogList>> = [];
  try {
    catalog = await fetchPublicMediaCatalogList();
  } catch {
    /* empty */
  }

  const filtered = catalog.filter((m) => matchArea(m, decodedArea));
  if (filtered.length === 0) {
    // district / city 매치 0건 — 404 (soft 404 회피)
    notFound();
  }

  const label = areaLabel(decodedArea, locale);
  const title = areaLandingTitle(decodedArea, locale, filtered.length);
  const description = areaLandingDescription(decodedArea, locale, filtered.length);

  // 같은 카탈로그에서 다른 area 추천 (내부 링크) — 최대 8개
  const otherAreas = (() => {
    const set = new Set<string>();
    for (const m of catalog) {
      const a = m.district || m.city;
      if (a && a !== decodedArea) set.add(a);
    }
    return Array.from(set).slice(0, 8);
  })();

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
    { name: label, path: `/media/area/${area}` },
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
            eyebrow={`// ${isKo ? "지구별 매체" : "BY DISTRICT"}`}
            title={title}
            description={description}
            icon={<MapPin className="size-7 dark:text-white text-gray-800" aria-hidden />}
            primaryCta={{
              href: "/media",
              label: isKo ? "전체 매체 보기" : "All media",
            }}
            secondaryCta={{
              href: "/media/map",
              label: isKo ? "지도에서 보기" : "View on map",
            }}
          />

          <MediaKeywordLandingCatalog items={filtered} locale={locale} />

          {otherAreas.length > 0 ? (
            <section className="tkad-media-links-footer border-t border-border/80 bg-muted py-12 text-foreground sm:py-16">
              <div className="ui-container">
                <p className="tkad-type-title text-muted-foreground sm:text-sm">
                  {isKo ? "다른 지구로 찾기" : "Browse other districts"}
                </p>
                <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  {isKo ? "근처·인근 지구" : "Nearby districts"}
                </h2>
                <ul className="mt-5 flex flex-wrap gap-2">
                  {otherAreas.map((a) => (
                    <li key={a}>
                      <Link
                        href={`/media/area/${encodeURIComponent(a)}`}
                        className="inline-flex items-center gap-1.5 rounded-2xl border-2 border-border bg-card px-4 py-2.5 text-sm font-medium text-card-foreground shadow-xs transition-colors hover:border-accent hover:bg-muted"
                      >
                        {a}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ) : null}
        </div>
      </HomeLandingDayNight>
    </>
  );
}

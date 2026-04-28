import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";
import {
  areaLabel,
  areaLandingDescription,
  areaLandingTitle,
} from "@/lib/media-keyword-landing";
import {
  buildBreadcrumbJsonLd,
  buildMediaCatalogItemListJsonLd,
} from "@/lib/structured-data";
import { pageAlternates } from "@/lib/seo";
import { MediaCatalogGridCard } from "@/components/media-catalog-grid-card";
import { MEDIA_CATALOG_GRID_CLASS } from "@/components/media-catalog-shared";
import { ArrowRight, MapPin } from "lucide-react";

type Props = {
  params: Promise<{ locale: string; area: string }>;
};

/**
 * `/[locale]/media/area/[area]` — district(시·군·구) 단위 키워드 랜딩.
 *
 * 매칭: m.district === decoded slug (1순위). 없으면 m.city === decoded.
 * 콘텐츠: 텍스트 템플릿 (AI 자동 생성 X).
 * 운영 안전: DB(fetchPublicMediaCatalog) source of truth. 0건이면 notFound.
 */

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
    const catalog = await fetchPublicMediaCatalog();
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
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function AreaLandingPage({ params }: Props) {
  const { locale: rawLocale, area } = await params;
  const locale = await resolveLocaleParam(Promise.resolve({ locale: rawLocale }));
  setRequestLocale(locale);

  const decodedArea = decodeURIComponent(area);
  const isKo = locale === "ko";

  let catalog: Awaited<ReturnType<typeof fetchPublicMediaCatalog>> = [];
  try {
    catalog = await fetchPublicMediaCatalog();
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

      <section className="bg-bx-black py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-accent">
            [ {isKo ? "지구별 매체" : "BY DISTRICT"} ]
          </p>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-bx-white sm:text-4xl lg:text-5xl">
            <MapPin
              className="mr-3 inline-block h-8 w-8 text-bx-accent"
              aria-hidden
            />
            {title}
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-relaxed text-bx-white/80 sm:text-lg">
            {description}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/media"
              className="inline-flex items-center gap-2 border-2 border-bx-white bg-transparent px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-white transition-colors hover:bg-bx-white hover:text-bx-black"
            >
              {isKo ? "전체 매체 보기" : "All media"}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/media/map"
              className="inline-flex items-center gap-2 border-2 border-bx-accent bg-bx-accent px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-white transition-colors hover:bg-bx-black hover:border-bx-black"
            >
              {isKo ? "지도에서 보기" : "View on map"}
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-bx-white py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
            [ {isKo ? "검증된 매체" : "VERIFIED"} ] · {filtered.length}{" "}
            {isKo ? "개" : "items"}
          </p>
          <ul className={`mt-4 ${MEDIA_CATALOG_GRID_CLASS}`}>
            {filtered.map((media) => (
              <li key={media.id} className="group">
                <Link
                  href={`/media/${media.id}`}
                  className="block"
                  aria-label={
                    isKo
                      ? `${media.name} 상세 보기`
                      : `${media.nameEn || media.name} details`
                  }
                >
                  <MediaCatalogGridCard
                    media={media}
                    isKo={isKo}
                    imagePreparingLabel={
                      isKo ? "이미지 준비 중" : "Image coming soon"
                    }
                    variant="link"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {otherAreas.length > 0 ? (
        <section className="border-t-2 border-bx-black bg-bx-off py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
              [ {isKo ? "다른 지구로 찾기" : "BROWSE OTHER DISTRICTS"} ]
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {otherAreas.map((a) => (
                <li key={a}>
                  <Link
                    href={`/media/area/${encodeURIComponent(a)}`}
                    className="inline-flex items-center gap-1.5 border-2 border-bx-black bg-bx-white px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-black transition-colors hover:bg-bx-black hover:text-bx-white"
                  >
                    {a}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";
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
import { pageAlternates } from "@/lib/seo";
import { MediaCatalogGridCard } from "@/components/media-catalog-grid-card";
import { MEDIA_CATALOG_GRID_CLASS } from "@/components/media-catalog-shared";
import { ArrowRight, Layers } from "lucide-react";

type Props = {
  params: Promise<{ locale: string; type: string }>;
};

/**
 * `/[locale]/media/type/[type]` — 매체 유형별 OOH 매체 키워드 랜딩.
 *
 * 운영 안전: DB(`fetchPublicMediaCatalog`) 가 source of truth, 콘텐츠는 텍스트
 * 템플릿 (AI 생성 X), 알 수 없는 슬러그 + 0건 → notFound.
 */

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale, type } = await params;
  const locale = await resolveLocaleParam(Promise.resolve({ locale: rawLocale }));
  const decodedType = decodeURIComponent(type);

  let count = 0;
  try {
    const catalog = await fetchPublicMediaCatalog();
    count = catalog.filter((m) => m.type === decodedType).length;
  } catch {
    /* 카탈로그 실패 시 count=0 */
  }

  const title = typeLandingTitle(decodedType, locale, count);
  const description = typeLandingDescription(decodedType, locale, count);
  const label = typeLabel(decodedType, locale);

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
    alternates: pageAlternates(locale, `/media/type/${type}`),
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function TypeLandingPage({ params }: Props) {
  const { locale: rawLocale, type } = await params;
  const locale = await resolveLocaleParam(Promise.resolve({ locale: rawLocale }));
  setRequestLocale(locale);

  const decodedType = decodeURIComponent(type);
  const isKo = locale === "ko";

  let catalog: Awaited<ReturnType<typeof fetchPublicMediaCatalog>> = [];
  try {
    catalog = await fetchPublicMediaCatalog();
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

      <section className="bg-bx-black py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-accent">
            [ {isKo ? "유형별 매체" : "BY TYPE"} ]
          </p>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-bx-white sm:text-4xl lg:text-5xl">
            <Layers
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
              href="/recommend"
              className="inline-flex items-center gap-2 border-2 border-bx-accent bg-bx-accent px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-white transition-colors hover:bg-bx-black hover:border-bx-black"
            >
              {isKo ? "AI 매체 추천" : "AI recommend"}
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-bx-white py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {filtered.length === 0 ? (
            <div className="border-2 border-bx-black bg-bx-off p-12 text-center">
              <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-bx-gray-dim">
                {`// `}
                {isKo
                  ? `현재 ${label} 유형의 매체가 없습니다.`
                  : `No ${label.toLowerCase()} media currently available.`}
              </p>
              <Link
                href="/media"
                className="mt-6 inline-flex items-center gap-2 border-2 border-bx-black bg-bx-black px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-white transition-colors hover:bg-bx-accent hover:border-bx-accent"
              >
                {isKo ? "전체 매체 보기" : "Browse all media"}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
                [ {isKo ? "검증된 매체" : "VERIFIED"} ] · {filtered.length} {isKo ? "개" : "items"}
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
            </>
          )}
        </div>
      </section>

      <section className="border-t-2 border-bx-black bg-bx-off py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
            [ {isKo ? "다른 유형으로 찾기" : "BROWSE OTHER TYPES"} ]
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {KNOWN_TYPE_SLUGS.filter((s) => s !== decodedType).map((slug) => (
              <li key={slug}>
                <Link
                  href={`/media/type/${slug}`}
                  className="inline-flex items-center gap-1.5 border-2 border-bx-black bg-bx-white px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-black transition-colors hover:bg-bx-black hover:text-bx-white"
                >
                  {typeLabel(slug, locale)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}

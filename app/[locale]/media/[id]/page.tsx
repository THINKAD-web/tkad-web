import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  ArrowLeft,
  Calculator,
  CircleDollarSign,
  Eye,
  MapPin,
  Monitor,
  Ruler,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  buildCaseStudyGalleryItems,
  getAllMediaIds,
  getMediaDetailGalleryUrls,
  getPrimaryMediaImageUrl,
  getSimilarMediaFromCatalog,
  typeLabels,
} from "@/lib/media-data";
import {
  buildMediaMetaDescription,
  buildMediaMetaKeywordsList,
  buildMediaPageTitle,
} from "@/lib/media-seo";
import { pageAlternates } from "@/lib/seo";
import {
  buildMediaBreadcrumbJsonLd,
  buildMediaPlaceJsonLd,
} from "@/lib/structured-data";
import {
  getAllKeywordFilterMediaIds,
  getSimilarKeywordFilterMediaItems,
  heroTagCandidatesFromKeyword,
  pickSearchKeywordHints,
} from "@/lib/keyword-filter-media-detail";
import { formatMediaLocationShort } from "@/lib/media-location-format";
import {
  formatCatalogPriceFieldWon,
  formatCatalogPriceKrwLong,
  formatMediaPriceWonWithSymbol,
  mediaDetailPricePeriodTranslationKey,
} from "@/lib/media-price-format";
import MediaCaseStudyGallery from "@/components/media-case-study-gallery";
import { RelatedCases } from "@/components/media-detail/related-cases";
import { MediaStickyCta } from "@/components/media-detail/sticky-cta";
import { getSuccessCasesForMedia } from "@/lib/public-content-queries";
import { fetchPublicMediaCatalog, resolveMediaForDetail } from "@/lib/public-media-catalog";
import { resolvePerformanceMetrics } from "@/lib/media-performance";
import MediaDetailExtras from "@/components/media-detail-extras";
import { RoadviewCard } from "@/components/media-detail/roadview-card";
import MediaDetailPerformance from "@/components/media-detail-performance";
import MediaDetailPremiumPoints from "@/components/media-detail-premium-points";
import { TrafficCharts } from "@/components/media-detail/traffic-charts";
import { MediaAvailabilityCalendar } from "@/components/media-detail/availability-calendar";
import MediaDetailStickyCta from "@/components/media-detail-sticky-cta";
import MediaSimilarCarousel from "@/components/media-similar-carousel";
import MediaDetailAdminActions from "@/components/media-detail-admin-actions";
import TrackMediaView from "@/components/track-media-view";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import MediaDetailHeroGallery from "@/components/media-detail-hero-gallery";
import { MediaDetailAddToCart } from "@/components/media-detail-add-to-cart";
import { MediaFavoriteButton } from "@/components/media-favorite-button";

type Props = { params: Promise<{ locale: string; id: string }> };

export const revalidate = 3600;

export function generateStaticParams() {
  const ids = [
    ...getAllMediaIds(),
    ...getAllKeywordFilterMediaIds(),
  ];
  return ids.map((id) => ({ id: String(id) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const { id } = await params;
  const media = await resolveMediaForDetail(id);
  if (!media) return { title: "Media" };
  const isKo = locale === "ko";
  const name = isKo ? media.name : media.nameEn || media.name;
  const title = buildMediaPageTitle(media, locale);
  const description = buildMediaMetaDescription(media, locale);
  const keywords = buildMediaMetaKeywordsList(media, locale, 28);

  const heroImage = getPrimaryMediaImageUrl(media);
  return {
    title,
    description,
    keywords,
    alternates: pageAlternates(locale, `/media/${media.id}`),
    openGraph: {
      title,
      description,
      type: "website",
      images: heroImage
        ? [
            {
              url: heroImage,
              width: 1200,
              height: 630,
              alt: name,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: heroImage ? [heroImage] : undefined,
    },
  };
}

export default async function MediaDetailPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const { id: idStr } = await params;
  const media = await resolveMediaForDetail(idStr);
  if (!media) notFound();

  const catalog = await fetchPublicMediaCatalog();
  const relatedCases = await getSuccessCasesForMedia(media.id);
  const t = await getTranslations({ locale, namespace: "media.detail" });
  const isKo = locale === "ko";
  const periodLabel = t(
    mediaDetailPricePeriodTranslationKey(media.pricePeriod),
  );

  const priceOptions = Array.isArray(media.priceOptions)
    ? media.priceOptions
    : undefined;
  const hasPriceOptions = Boolean(priceOptions && priceOptions.length > 0);
  const primaryPriceOption = priceOptions?.[0];

  const primaryPricePeriodLabel = primaryPriceOption?.period
    ? t(
        mediaDetailPricePeriodTranslationKey(
          primaryPriceOption.period as any,
        ),
      )
    : periodLabel;

  const monthly =
    media.monthlyFootTraffic ??
    Math.round(media.dailyFootTraffic * 30);

  const similar = media.keywordFilter
    ? getSimilarKeywordFilterMediaItems(media.id, 3)
    : getSimilarMediaFromCatalog(catalog, media, 3);
  const galleryImages = getMediaDetailGalleryUrls(media);
  const heroImage = galleryImages[0] ?? "";
  const caseStudyItems = buildCaseStudyGalleryItems(media);
  const typeLabel =
    (isKo ? typeLabels[media.type]?.ko : typeLabels[media.type]?.en) ?? "";
  const featuresText = isKo ? media.features : media.featuresEn;
  const performanceMetrics = resolvePerformanceMetrics(media);
  const compareHref =
    similar.length > 0
      ? `/compare?ids=${media.id},${similar[0].id}`
      : "/media";

  const heroTags = media.keywordFilter
    ? heroTagCandidatesFromKeyword(media.keywordFilter, media.size)
    : [
        media.size,
        typeLabel,
        ...(media.targetAge
          ? media.targetAge
              .split(/[,，]/)
              .map((s) => s.trim())
              .filter(Boolean)
              .slice(0, 3)
          : []),
      ].filter((x): x is string => Boolean(x && String(x).trim()));

  const keywordHints = media.keywordFilter
    ? pickSearchKeywordHints(media.keywordFilter.searchKeywords)
    : [];

  const overviewBody = (() => {
    const cat = (
      isKo ? media.catalogDescription : media.catalogDescriptionEn
    )?.trim();
    if (cat) return cat;
    const long = (
      isKo ? media.longDescriptionKo : media.longDescriptionEn
    )?.trim();
    if (long) return long;
    const desc = (isKo ? media.description : (media.descriptionEn || media.description))?.trim();
    return desc ?? "";
  })();

  const placeJsonLd = buildMediaPlaceJsonLd(media, locale);
  const breadcrumbJsonLd = buildMediaBreadcrumbJsonLd(media, locale);

  return (
    <>
      <TrackMediaView mediaId={media.id} />
      <script
        type="application/ld+json"
        // SEO: Place + BreadcrumbList JSON-LD. dangerouslySetInnerHTML 는
        // 매체 데이터에서 생성된 안전한 객체이므로 XSS 위험 없음.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([placeJsonLd, breadcrumbJsonLd]),
        }}
      />
      {/* 메인 이미지 + 히어로 오버레이 (네트워크 매체와 유사 구조) */}
      <MediaDetailHeroGallery
        images={galleryImages}
        heroSrc={heroImage}
        altBase={isKo ? media.name : (media.nameEn || media.name)}
        labels={{
          close: t("galleryLightboxClose"),
          prev: t("galleryLightboxPrev"),
          next: t("galleryLightboxNext"),
          expand: t("galleryExpand"),
          clickHint: t("galleryClickHint"),
        }}
      >
        <div className="mx-auto flex h-full w-full max-w-6xl flex-col justify-between gap-4">
          <div className="flex items-start justify-between gap-3">
            <Link
              href="/media"
              className="-ml-1 inline-flex items-center gap-1.5 border-2 border-bx-white px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-bx-white transition-colors hover:bg-bx-white hover:text-bx-black"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t("back")}
            </Link>
            <MediaDetailAdminActions />
          </div>

          <div className="grid gap-6 pb-2 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1.3fr)] lg:items-end">
            <div className="min-w-0 space-y-4 text-bx-white">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                [ MEDIA / {typeLabel?.toUpperCase() ?? "OOH"} ]
              </p>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h1 className="break-words text-2xl font-bold leading-[1.1] tracking-tight sm:text-3xl md:text-4xl">
                  {isKo ? media.name : (media.nameEn || media.name)}
                </h1>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {media.availability && media.availability !== "available" ? (
                    <span
                      className={
                        media.availability === "reserved"
                          ? "border-2 border-bx-accent bg-bx-accent px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-bx-white"
                          : "border-2 border-bx-white bg-bx-black/60 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-bx-white"
                      }
                    >
                      {t(`availability.${media.availability}`)}
                    </span>
                  ) : media.availability === "available" ? (
                    <span className="border-2 border-bx-accent bg-bx-black/60 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-bx-accent">
                      {t("availability.available")}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1.5 border-2 border-bx-white bg-bx-black/60 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-bx-white">
                    <Eye className="h-3.5 w-3.5" aria-hidden />
                    {t("visibilityBadge", {
                      score: performanceMetrics.visibilityScore,
                    })}
                  </span>
                </div>
              </div>
              {heroTags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {heroTags.map((tag) => (
                    <span
                      key={tag}
                      className="border-2 border-bx-white/40 bg-bx-black/30 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-bx-white"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-[0.18em] text-bx-white/80 sm:text-[12px]">
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                  {formatMediaLocationShort(media, isKo)}
                </span>
                {typeLabel ? (
                  <>
                    <span className="hidden text-bx-white/40 sm:inline" aria-hidden>
                      ·
                    </span>
                    <span className="text-bx-accent">{typeLabel}</span>
                  </>
                ) : null}
              </p>
              {featuresText ? (
                <p className="max-w-2xl text-sm leading-relaxed text-bx-white/85">
                  {featuresText}
                </p>
              ) : null}
            </div>

            <aside className="min-w-0 border-2 border-bx-white bg-bx-black/60 p-5 text-sm text-bx-white backdrop-blur-md sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <CoreFact
                  icon={CircleDollarSign}
                  label={t("priceTitle")}
                  value={
                    media.keywordFilter ? (
                      <>
                        {hasPriceOptions && primaryPriceOption ? (
                          <span className="block font-mono text-lg font-bold tabular-nums text-bx-accent">
                            {formatCatalogPriceFieldWon(
                              primaryPriceOption.price,
                            )}
                          </span>
                        ) : (
                          <span className="block font-mono text-base font-bold tabular-nums text-bx-accent sm:text-lg">
                            {formatMediaPriceWonWithSymbol(
                              media.keywordFilter.budgetMin,
                            )}{" "}
                            <span className="text-bx-white/70">~</span>{" "}
                            {formatMediaPriceWonWithSymbol(
                              media.keywordFilter.budgetMax,
                            )}
                          </span>
                        )}
                        <span className="mt-1 block font-mono text-[11px] tracking-tight text-bx-accent/90">
                          {media.keywordFilter.priceText}
                        </span>
                        {hasPriceOptions ? (
                          <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-bx-white/65">
                            {t("priceOptionsSummaryHint")}
                          </span>
                        ) : (
                          <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-bx-white/65">
                            {periodLabel}
                          </span>
                        )}
                      </>
                    ) : hasPriceOptions && primaryPriceOption ? (
                      <>
                        <span className="block font-mono text-lg font-bold tabular-nums text-bx-accent">
                          {formatCatalogPriceFieldWon(primaryPriceOption.price)}
                        </span>
                        <span className="mt-0.5 block font-mono text-[11px] tracking-tight text-bx-white/85">
                          {primaryPricePeriodLabel} · {primaryPriceOption.label}
                        </span>
                        <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-bx-white/65">
                          {t("priceOptionsSummaryHint")}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="block font-mono text-lg font-bold tabular-nums text-bx-accent">
                          {formatCatalogPriceFieldWon(media.price)}
                        </span>
                        <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-bx-white/65">
                          {periodLabel}
                        </span>
                      </>
                    )
                  }
                />
                <CoreFact
                  icon={Users}
                  label={t("footTrafficTitle")}
                  value={
                    <span className="block font-mono text-lg font-bold tabular-nums text-bx-white">
                      {monthly.toLocaleString()}
                    </span>
                  }
                />
              </div>

              <div className="mt-6 border-t-2 border-bx-white/30 pt-5">
                <MediaStickyCta
                  mediaId={media.id}
                  mediaName={media.name}
                  mediaNameEn={media.nameEn || media.name}
                  isKo={isKo}
                />
              </div>
            </aside>
          </div>
        </div>
      </MediaDetailHeroGallery>

      <div className="sticky top-[72px] z-30 border-b-2 border-bx-black bg-bx-white sm:static">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-3.5 lg:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="hidden h-7 w-7 shrink-0 items-center justify-center border-2 border-bx-black bg-bx-accent text-bx-white sm:inline-flex">
              ✓
            </span>
            <p className="truncate font-mono text-[11px] uppercase tracking-[0.18em] text-bx-black sm:text-[12px]">
              {`// 관심 가는 매체라면 견적서에 담아보세요`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <MediaFavoriteButton
              mediaId={media.id}
              mediaName={isKo ? media.name : (media.nameEn || media.name)}
            />
            <MediaDetailAddToCart mediaId={media.id} mediaName={isKo ? media.name : (media.nameEn || media.name)} />
          </div>
        </div>
      </div>

      <section className="bg-bx-white py-10 pb-28 sm:py-14 sm:pb-32">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <MediaDetailExtras
            media={media}
            locale={locale}
            labels={{
              locationMap: t("locationMap"),
              openKakao: t("openKakao"),
              openGoogle: t("openGoogle"),
              inquiry: t("inquiry"),
              quote: t("quote"),
              galleryLightboxClose: t("galleryLightboxClose"),
              galleryLightboxPrev: t("galleryLightboxPrev"),
              galleryLightboxNext: t("galleryLightboxNext"),
              galleryExpand: t("galleryExpand"),
              galleryClickHint: t("galleryClickHint"),
              locationAddressLabel: t("locationAddressLabel"),
              locationRegionLabel: t("locationRegionLabel"),
              kakaoMapEmbedBadge: t("kakaoMapEmbedBadge"),
            }}
          />

          <div className="mt-6">
            <RoadviewCard
              lat={media.lat}
              lng={media.lng}
              mediaName={isKo ? media.name : media.nameEn || media.name}
            />
          </div>

          {media.keywordFilter ? (
            <MediaDetailPremiumPoints
              title={t("premiumPointsTitle")}
              items={media.keywordFilter.specialFeature ?? []}
            />
          ) : null}

          {keywordHints.length > 0 ? (
            <section
              aria-labelledby="media-detail-keyword-hints-heading"
              className="mt-10"
            >
              <p
                id="media-detail-keyword-hints-heading"
                className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim"
              >
                [ {t("keywordSearchTagsTitle")} ]
              </p>
              <div className="flex flex-wrap gap-2">
                {keywordHints.map((kw) => (
                  <span
                    key={kw}
                    className="border-2 border-bx-black bg-bx-white px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-bx-black"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          <div className="mt-12">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
              [ CORE INFO ]
            </p>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-bx-black sm:text-2xl">
              {t("coreInfoTitle")}
            </h2>
          </div>
          <div className="mt-4 border-2 border-bx-black bg-bx-white p-6 sm:p-8">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8">
              <CoreFact
                icon={Ruler}
                label={t("size")}
                value={
                  <span className="font-semibold">
                    {media.size || t("empty")}
                  </span>
                }
              />
              <CoreFact
                icon={Monitor}
                label={t("resolution")}
                value={
                  <span className="font-semibold">
                    {media.resolution || t("empty")}
                  </span>
                }
              />
              <CoreFact
                icon={CircleDollarSign}
                label={t("priceTitle")}
                value={
                  media.keywordFilter ? (
                    <>
                      {hasPriceOptions && primaryPriceOption ? (
                        <span className="break-all font-mono text-base font-bold tabular-nums text-bx-black sm:text-lg">
                          {formatCatalogPriceFieldWon(primaryPriceOption.price)}
                        </span>
                      ) : (
                        <span className="break-all font-mono text-base font-bold tabular-nums text-bx-black sm:text-lg">
                          {formatMediaPriceWonWithSymbol(
                            media.keywordFilter.budgetMin,
                          )}{" "}
                          ~{" "}
                          {formatMediaPriceWonWithSymbol(
                            media.keywordFilter.budgetMax,
                          )}
                        </span>
                      )}
                      <span className="mt-1 block text-sm font-semibold text-bx-accent">
                        {media.keywordFilter.priceText}
                      </span>
                      <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-bx-gray-dim">
                        {hasPriceOptions
                          ? t("priceOptionsSummaryHint")
                          : `${t("budgetRangeHint")} · ${t("priceUnitWon")} · ${periodLabel}`}
                      </span>
                    </>
                  ) : hasPriceOptions && primaryPriceOption ? (
                    <>
                      <span className="break-all font-mono text-base font-bold tabular-nums text-bx-black sm:text-lg">
                        {formatCatalogPriceFieldWon(primaryPriceOption.price)}
                      </span>
                      <span className="mt-1 block text-sm font-semibold text-bx-black">
                        {primaryPriceOption.label} ·{" "}
                        {t(
                          mediaDetailPricePeriodTranslationKey(
                            (primaryPriceOption.period as any) ??
                              media.pricePeriod,
                          ),
                        )}
                      </span>
                      <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-bx-gray-dim">
                        {t("priceOptionsSummaryHint")}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="break-all font-mono text-base font-bold tabular-nums text-bx-black sm:text-lg">
                        {formatCatalogPriceFieldWon(media.price)}
                      </span>
                      <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-bx-gray-dim">
                        {t("priceUnit")} · {periodLabel}
                      </span>
                    </>
                  )
                }
              />
              <CoreFact
                icon={Users}
                label={t("footTrafficTitle")}
                value={
                  <>
                    <span className="block font-mono text-lg font-bold tabular-nums leading-tight text-bx-black sm:text-xl">
                      {monthly.toLocaleString()}
                    </span>
                    <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-bx-gray-dim">
                      {t("monthly")}
                    </span>
                    <span className="mt-2 block font-mono text-[11px] tracking-tight text-bx-gray-dim">
                      {t("daily")} {media.dailyFootTraffic.toLocaleString()}
                    </span>
                  </>
                }
              />
            </div>
          </div>

          {hasPriceOptions && priceOptions ? (
            <section
              id="media-detail-price-options"
              aria-labelledby="media-detail-price-options-heading"
              className="mt-10"
            >
              <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                    [ PRICE OPTIONS ]
                  </p>
                  <h2
                    id="media-detail-price-options-heading"
                    className="mt-2 text-xl font-bold tracking-tight text-bx-black sm:text-2xl"
                  >
                    {t("priceOptionsSectionTitle")}
                  </h2>
                </div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
                  {`// THINKAD · OOH`}
                </p>
              </div>
              {media.keywordFilter?.priceText ? (
                <div className="mb-6 border-2 border-bx-accent bg-bx-white px-5 py-4">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                    [ {isKo ? "안내 요금" : "RATE NOTE"} ]
                  </p>
                  <p className="mt-1.5 text-sm font-semibold leading-relaxed text-bx-black">
                    {media.keywordFilter.priceText}
                  </p>
                </div>
              ) : null}
              <div className="grid grid-cols-1 gap-0 sm:grid-cols-2">
                {priceOptions.map((opt, idx) => {
                  const periodKey = mediaDetailPricePeriodTranslationKey(
                    (opt.period as string | undefined) ?? media.pricePeriod,
                  );
                  return (
                    <article
                      key={`${opt.label}-${idx}`}
                      className="group relative -mt-[2px] -ml-[2px] flex flex-col border-2 border-bx-black bg-bx-white p-6 transition-colors hover:bg-bx-off"
                    >
                      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
                        [{String(idx + 1).padStart(2, "0")}]
                      </p>
                      <h3 className="mt-2 text-base font-bold leading-snug tracking-tight text-bx-black">
                        {opt.label}
                      </h3>
                      <p className="mt-4 font-mono text-2xl font-bold tabular-nums tracking-tight text-bx-black sm:text-[1.65rem]">
                        {formatCatalogPriceKrwLong(opt.price, locale)}
                      </p>
                      <p className="mt-2 inline-flex w-fit items-center border-2 border-bx-black bg-bx-white px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-bx-black">
                        {t(periodKey)}
                      </p>
                      {opt.description?.trim() ? (
                        <p className="mt-4 border-t-2 border-bx-black pt-4 text-sm leading-relaxed text-bx-gray-dim">
                          {opt.description}
                        </p>
                      ) : (
                        <p className="mt-4 border-t-2 border-bx-black pt-4 font-mono text-[11px] tracking-tight text-bx-gray-dim">
                          {isKo ? "상세 조건은 견적 시 안내드립니다." : "Terms confirmed at quote stage."}
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          ) : null}

          <div className="mt-12">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
              [ SPECS ]
            </p>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-bx-black sm:text-2xl">
              {t("specsTitle")}
            </h2>
          </div>
          <dl className="mt-4 grid gap-6 border-2 border-bx-black bg-bx-white p-6 sm:grid-cols-2 sm:p-8">
            {media.keywordFilter ? (
              <>
                <SpecRow
                  label={t("keywordStatusLabel")}
                  value={media.keywordFilter.status}
                />
                <SpecRow
                  label={t("exposureStyleTitle")}
                  value={media.keywordFilter.exposureTime.join(" · ")}
                />
                <SpecRow
                  label={t("durationOptionsTitle")}
                  value={media.keywordFilter.duration.join(" · ")}
                />
              </>
            ) : null}
            <SpecRow label={t("brightness")} value={media.brightness} />
            {!media.keywordFilter ? (
              <SpecRow
                label={t("operatingHours")}
                value={isKo ? media.operatingHours : media.operatingHoursEn}
              />
            ) : null}
            <SpecRow
              label={t("installYear")}
              value={
                media.installYear
                  ? String(media.installYear)
                  : undefined
              }
            />
            <SpecRow
              label={t("targetAge")}
              value={isKo ? media.targetAge : undefined}
            />
          </dl>

          <MediaDetailPerformance metrics={performanceMetrics} />

          <div className="mt-8">
            <TrafficCharts
              mediaType={media.type}
              region={media.region}
              stored={media.trafficPattern ?? null}
              dailyFootfall={media.dailyFootTraffic ?? null}
              isKo={isKo}
            />
          </div>

          <MediaAvailabilityCalendar
            mediaId={media.id}
            mediaName={isKo ? media.name : (media.nameEn || media.name)}
          />

          <section
            aria-labelledby="media-detail-description-heading"
            className="mt-12 border-t-2 border-bx-black py-12"
          >
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
              [ DESCRIPTION ]
            </p>
            <h2
              id="media-detail-description-heading"
              className="mt-2 mb-10 text-xl font-bold tracking-tight text-bx-black sm:text-2xl"
            >
              {t("detailDescriptionTitle")}
            </h2>
            <div className="space-y-12">
              {overviewBody?.trim() ? (
                <div>
                  <h3 className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
                    [ {t("placementOverviewTitle")} ]
                  </h3>
                  <div
                    className={[
                      "prose prose-slate max-w-none",
                      "prose-p:text-[15px] prose-p:leading-[1.8] prose-p:text-bx-black",
                      "prose-headings:scroll-mt-24 prose-headings:font-bold prose-headings:text-bx-black",
                      "prose-strong:font-semibold prose-strong:text-bx-black",
                    ].join(" ")}
                  >
                    <ProseParagraphs text={overviewBody} />
                  </div>
                </div>
              ) : null}
              <div>
                <h3 className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
                  [ {t("historyTitle")} ]
                </h3>
                <div
                  className={[
                    "prose prose-slate max-w-none",
                    "prose-p:text-[15px] prose-p:leading-[1.8] prose-p:text-bx-black",
                    "prose-headings:scroll-mt-24 prose-headings:font-bold prose-headings:text-bx-black",
                    "prose-strong:font-semibold prose-strong:text-bx-black",
                  ].join(" ")}
                >
                  <ProseParagraphs
                    text={
                      (isKo
                        ? media.advertiserHistory
                        : media.advertiserHistoryEn) || t("empty")
                    }
                  />
                </div>
              </div>
              <div>
                <h3 className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
                  [ {t("nearbyTitle")} ]
                </h3>
                <div
                  className={[
                    "prose prose-slate max-w-none",
                    "prose-p:text-[15px] prose-p:leading-[1.8] prose-p:text-bx-black",
                    "prose-headings:font-bold prose-headings:text-bx-black",
                    "prose-strong:font-semibold prose-strong:text-bx-black",
                  ].join(" ")}
                >
                  <ProseParagraphs
                    text={
                      (isKo ? media.nearbyFacilities : media.nearbyFacilitiesEn) ||
                      t("empty")
                    }
                  />
                </div>
              </div>
              {featuresText ? (
                <EffectMemoCallout title={t("effectMemoTitle")}>
                  <div
                    className={[
                      "prose prose-slate max-w-none",
                      "prose-p:mt-0 prose-p:text-[15px] prose-p:leading-[1.8] prose-p:text-bx-black",
                      "prose-strong:font-semibold prose-strong:text-bx-black",
                    ].join(" ")}
                  >
                    <ProseParagraphs text={featuresText} />
                  </div>
                </EffectMemoCallout>
              ) : null}
            </div>
          </section>

          {relatedCases.length > 0 ? (
            <div className="mt-12">
              <RelatedCases cases={relatedCases} isKo={isKo} />
            </div>
          ) : null}

          {caseStudyItems.length > 0 ? (
            <>
              <div className="mt-12">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                  [ CASE STUDIES ]
                </p>
                <h2 className="mt-2 mb-4 text-xl font-bold tracking-tight text-bx-black sm:text-2xl">
                  {t("caseStudiesTitle")}
                </h2>
              </div>
              <MediaCaseStudyGallery
                photos={caseStudyItems}
                isKo={isKo}
                labels={{
                  close: t("galleryLightboxClose"),
                  prev: t("galleryLightboxPrev"),
                  next: t("galleryLightboxNext"),
                  expand: t("galleryExpand"),
                  clickHint: t("galleryClickHint"),
                }}
              />
            </>
          ) : null}

          <MediaSimilarCarousel
            items={similar}
            isKo={isKo}
            title={t("similarTitle")}
            sortable={
              media.keywordFilter
                ? undefined
                : { catalog, currentMedia: media, limit: 6 }
            }
          />
        </div>
      </section>

      <MediaDetailStickyCta media={media} compareHref={compareHref} />
    </>
  );
}

function ProseParagraphs({ text }: { text: string }) {
  const normalized = text.trim();
  if (!normalized) {
    return null;
  }
  const blocks = normalized.split(/\n\s*\n/).filter(Boolean);
  if (blocks.length <= 1) {
    return <p>{normalized}</p>;
  }
  return (
    <>
      {blocks.map((block, i) => (
        <p key={i}>{block.replace(/\s*\n\s*/g, " ").trim()}</p>
      ))}
    </>
  );
}

function EffectMemoCallout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="relative border-2 border-bx-black bg-bx-off px-5 py-6 sm:px-8 sm:py-7">
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-bx-accent"
        aria-hidden
      />
      <div className="relative flex gap-4 pl-3 sm:pl-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center border-2 border-bx-black bg-bx-black text-bx-accent">
          <Sparkles className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
            [ {title} ]
          </p>
          <div className="mt-3 text-bx-black">{children}</div>
        </div>
      </div>
    </div>
  );
}

function CoreFact({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-bx-black bg-bx-black text-bx-accent"
        aria-hidden
      >
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
          [ {label} ]
        </p>
        <div className="mt-2 min-w-0 text-sm leading-relaxed text-bx-black">
          {value}
        </div>
      </div>
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <dt className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
        [ {label} ]
      </dt>
      <dd className="mt-1 text-sm font-medium text-bx-black">{value}</dd>
    </div>
  );
}

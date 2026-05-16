import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  ArrowLeft,
  CircleDollarSign,
  Eye,
  MapPin,
  Monitor,
  Ruler,
  Sparkles,
  Users,
} from "lucide-react";
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
import { isInstantBookingEligible } from "@/lib/instant-booking-eligibility";
import MediaDetailStickyCta from "@/components/media-detail-sticky-cta";
import MediaSimilarCarousel from "@/components/media-similar-carousel";
import MediaDetailAdminActions from "@/components/media-detail-admin-actions";
import TrackMediaView from "@/components/track-media-view";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import MediaDetailHeroGallery from "@/components/media-detail-hero-gallery";
import { MediaDetailAddToCart } from "@/components/media-detail-add-to-cart";
import { MediaFavoriteButton } from "@/components/media-favorite-button";
import { SectionHead } from "@/components/brutalist/section-head";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";

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
          primaryPriceOption.period as unknown as string,
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

      <HomeLandingDayNight>
        <div className="tkad-landing-neon tkad-planner-neon tkad-media-page">
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
              className="-ml-1 inline-flex items-center gap-1.5 border-2 border-hero-fg px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-hero-fg transition-colors hover:bg-card hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t("back")}
            </Link>
            <MediaDetailAdminActions />
          </div>

          <div className="grid gap-8 pb-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1.35fr)] lg:items-end">
            <div className="min-w-0 space-y-5 text-white">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white/60">
                {`// MEDIA · ${typeLabel?.toUpperCase() ?? "OOH"}`}
              </p>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h1 className="text-balance break-words text-[clamp(30px,3.7vw,48px)] font-[950] leading-[1.02] tracking-[-0.055em] text-white [text-shadow:0_30px_160px_rgba(0,0,0,0.9)]">
                  {isKo ? media.name : (media.nameEn || media.name)}
                </h1>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {media.availability && media.availability !== "available" ? (
                    <span
                      className={
                        media.availability === "reserved"
                          ? "rounded-xl border border-white/18 bg-white/10 px-3 py-1 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-[0_18px_70px_rgba(0,0,0,0.55)] backdrop-blur"
                          : "rounded-xl border border-white/18 bg-black/30 px-3 py-1 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-white/85 backdrop-blur"
                      }
                    >
                      {t(`availability.${media.availability}`)}
                    </span>
                  ) : media.availability === "available" ? (
                    <span className="rounded-xl border border-white/18 bg-black/30 px-3 py-1 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-white/85 backdrop-blur">
                      {t("availability.available")}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/18 bg-black/30 px-3 py-1 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-white/90 backdrop-blur">
                    <Eye className="h-3.5 w-3.5" aria-hidden />
                    {t("visibilityBadge", {
                      score: performanceMetrics.visibilityScore,
                    })}
                  </span>
                </div>
              </div>

              {heroTags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {heroTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-white/14 bg-white/8 px-3 py-1 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-white/80 backdrop-blur"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}

              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-[0.18em] text-white/80 sm:text-[12px]">
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                  {formatMediaLocationShort(media, isKo)}
                </span>
                {typeLabel ? (
                  <>
                    <span className="hidden text-white/35 sm:inline" aria-hidden>
                      ·
                    </span>
                    <span className="tkad-home-accent-text">{typeLabel}</span>
                  </>
                ) : null}
              </p>

              {featuresText ? (
                <p className="max-w-2xl text-sm leading-relaxed text-white/82 sm:text-[15px]">
                  {featuresText}
                </p>
              ) : null}
            </div>

            <aside className="tkad-neon-border tkad-neon-glow min-w-0 rounded-[28px] border border-white/12 bg-white/6 p-5 text-sm text-white shadow-[0_28px_120px_rgba(0,0,0,0.75)] backdrop-blur-md sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <CoreFact
                  icon={CircleDollarSign}
                  label={t("priceTitle")}
                  value={
                    media.keywordFilter ? (
                      <>
                        {hasPriceOptions && primaryPriceOption ? (
                          <span className="block font-mono text-lg font-black tabular-nums text-white">
                            {formatCatalogPriceFieldWon(primaryPriceOption.price)}
                          </span>
                        ) : (
                          <span className="block font-mono text-base font-black tabular-nums text-white sm:text-lg">
                            {formatMediaPriceWonWithSymbol(media.keywordFilter.budgetMin)}{" "}
                            <span className="text-white/55">~</span>{" "}
                            {formatMediaPriceWonWithSymbol(media.keywordFilter.budgetMax)}
                          </span>
                        )}
                        <span className="mt-1 block font-mono text-[11px] tracking-tight text-white/75">
                          {media.keywordFilter.priceText}
                        </span>
                        {hasPriceOptions ? (
                          <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-white/55">
                            {t("priceOptionsSummaryHint")}
                          </span>
                        ) : (
                          <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-white/55">
                            {periodLabel}
                          </span>
                        )}
                      </>
                    ) : hasPriceOptions && primaryPriceOption ? (
                      <>
                        <span className="block font-mono text-lg font-black tabular-nums text-white">
                          {formatCatalogPriceFieldWon(primaryPriceOption.price)}
                        </span>
                        <span className="mt-0.5 block font-mono text-[11px] tracking-tight text-white/75">
                          {primaryPricePeriodLabel} · {primaryPriceOption.label}
                        </span>
                        <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-white/55">
                          {t("priceOptionsSummaryHint")}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="block font-mono text-lg font-black tabular-nums text-white">
                          {formatCatalogPriceFieldWon(media.price)}
                        </span>
                        <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-white/55">
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
                    <span className="block font-mono text-lg font-black tabular-nums text-white">
                      {monthly.toLocaleString()}
                    </span>
                  }
                />
              </div>

              <div className="mt-6 border-t border-white/12 pt-5">
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

      <div className="sticky top-[72px] z-30 sm:static">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-[22px] border border-border/70 bg-card/75 px-4 py-3 shadow-sm backdrop-blur sm:rounded-[24px] sm:px-5 sm:py-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-2xl border border-border/80 bg-muted/50 text-foreground shadow-xs backdrop-blur sm:inline-flex">
              ✓
            </span>
            <p className="truncate font-mono text-[11px] uppercase tracking-[0.18em] text-foreground sm:text-[12px]">
              {`// 관심 가는 매체라면 견적서에 담아보세요`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <MediaFavoriteButton
              mediaId={media.id}
              mediaName={media.name}
              mediaNameEn={media.nameEn || media.name}
            />
            <MediaDetailAddToCart mediaId={media.id} mediaName={isKo ? media.name : (media.nameEn || media.name)} />
          </div>
        </div>
          </div>
        </div>
      </div>

      <section className="bg-card py-10 pb-28 sm:py-14 sm:pb-32">
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
                className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground"
              >
                [ {t("keywordSearchTagsTitle")} ]
              </p>
              <div className="flex flex-wrap gap-2">
                {keywordHints.map((kw) => (
                  <span
                    key={kw}
                    className="border-2 border-border bg-card px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-foreground"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          <div className="mt-16">
            <SectionHead
              number="01"
              category={isKo ? "Core" : "Core"}
              title={t("coreInfoTitle")}
              meta={isKo ? "핵심 지표를 한 번에" : "Key facts at a glance"}
              divider={false}
              className="mb-6"
            />
          </div>
          <div className="mt-4 border-2 border-border bg-card p-6 sm:p-8">
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
                        <span className="break-all font-mono text-base font-bold tabular-nums text-foreground sm:text-lg">
                          {formatCatalogPriceFieldWon(primaryPriceOption.price)}
                        </span>
                      ) : (
                        <span className="break-all font-mono text-base font-bold tabular-nums text-foreground sm:text-lg">
                          {formatMediaPriceWonWithSymbol(
                            media.keywordFilter.budgetMin,
                          )}{" "}
                          ~{" "}
                          {formatMediaPriceWonWithSymbol(
                            media.keywordFilter.budgetMax,
                          )}
                        </span>
                      )}
                      <span className="mt-1 block text-sm font-semibold text-accent">
                        {media.keywordFilter.priceText}
                      </span>
                      <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                        {hasPriceOptions
                          ? t("priceOptionsSummaryHint")
                          : `${t("budgetRangeHint")} · ${t("priceUnitWon")} · ${periodLabel}`}
                      </span>
                    </>
                  ) : hasPriceOptions && primaryPriceOption ? (
                    <>
                      <span className="break-all font-mono text-base font-bold tabular-nums text-foreground sm:text-lg">
                        {formatCatalogPriceFieldWon(primaryPriceOption.price)}
                      </span>
                      <span className="mt-1 block text-sm font-semibold text-foreground">
                        {primaryPriceOption.label} ·{" "}
                        {t(
                          mediaDetailPricePeriodTranslationKey(
                            (primaryPriceOption.period as unknown as string) ??
                              media.pricePeriod,
                          ),
                        )}
                      </span>
                      <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                        {t("priceOptionsSummaryHint")}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="break-all font-mono text-base font-bold tabular-nums text-foreground sm:text-lg">
                        {formatCatalogPriceFieldWon(media.price)}
                      </span>
                      <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
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
                    <span className="block font-mono text-lg font-bold tabular-nums leading-tight text-foreground sm:text-xl">
                      {monthly.toLocaleString()}
                    </span>
                    <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      {t("monthly")}
                    </span>
                    <span className="mt-2 block font-mono text-[11px] tracking-tight text-muted-foreground">
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
              <div id="media-detail-price-options-heading" className="mb-6">
                <SectionHead
                  number="02"
                  category={isKo ? "Pricing" : "Pricing"}
                  title={t("priceOptionsSectionTitle")}
                  meta="THINKAD · OOH"
                  className="mb-5"
                />
              </div>
              {media.keywordFilter?.priceText ? (
                <div className="mb-6 border-2 border-accent bg-card px-5 py-4">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
                    [ {isKo ? "안내 요금" : "RATE NOTE"} ]
                  </p>
                  <p className="mt-1.5 text-sm font-semibold leading-relaxed text-foreground">
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
                      className="group relative -mt-[2px] -ml-[2px] flex flex-col border-2 border-border bg-card p-6 transition-colors hover:bg-muted"
                    >
                      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                        [{String(idx + 1).padStart(2, "0")}]
                      </p>
                      <h3 className="mt-2 text-base font-bold leading-snug tracking-tight text-foreground">
                        {opt.label}
                      </h3>
                      <p className="mt-4 font-mono text-2xl font-bold tabular-nums tracking-tight text-foreground sm:text-[1.65rem]">
                        {formatCatalogPriceKrwLong(opt.price, locale)}
                      </p>
                      <p className="mt-2 inline-flex w-fit items-center border-2 border-border bg-card px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-foreground">
                        {t(periodKey)}
                      </p>
                      {opt.description?.trim() ? (
                        <p className="mt-4 border-t-2 border-border pt-4 text-sm leading-relaxed text-muted-foreground">
                          {opt.description}
                        </p>
                      ) : (
                        <p className="mt-4 border-t-2 border-border pt-4 font-mono text-[11px] tracking-tight text-muted-foreground">
                          {isKo ? "상세 조건은 견적 시 안내드립니다." : "Terms confirmed at quote stage."}
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          ) : null}

          <div className="mt-16">
            <SectionHead
              number="03"
              category={isKo ? "Specs" : "Specs"}
              title={t("specsTitle")}
              meta={isKo ? "규격·운영·타깃" : "Specs, hours, audience"}
              className="mb-6"
            />
          </div>
          <dl className="mt-4 grid gap-6 border-2 border-border bg-card p-6 sm:grid-cols-2 sm:p-8">
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
            instantBookingEligible={isInstantBookingEligible(media).eligible}
          />

          <section
            aria-labelledby="media-detail-description-heading"
            className="mt-12 border-t-2 border-border py-12"
          >
            <h2
              id="media-detail-description-heading"
              className="sr-only"
            >
              {t("detailDescriptionTitle")}
            </h2>
            <SectionHead
              number="04"
              category={isKo ? "Details" : "Details"}
              title={t("detailDescriptionTitle")}
              meta={isKo ? "설명·히스토리·주변" : "Overview, history, nearby"}
              className="mb-8"
            />
            <div className="space-y-12">
              {overviewBody?.trim() ? (
                <div>
                  <h3 className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                    [ {t("placementOverviewTitle")} ]
                  </h3>
                  <div
                    className={[
                      "prose prose-slate max-w-none",
                      "prose-p:text-[15px] prose-p:leading-[1.8] prose-p:text-foreground",
                      "prose-headings:scroll-mt-24 prose-headings:font-bold prose-headings:text-foreground",
                      "prose-strong:font-semibold prose-strong:text-foreground",
                    ].join(" ")}
                  >
                    <ProseParagraphs text={overviewBody} />
                  </div>
                </div>
              ) : null}
              <div>
                <h3 className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                  [ {t("historyTitle")} ]
                </h3>
                <div
                  className={[
                    "prose prose-slate max-w-none",
                    "prose-p:text-[15px] prose-p:leading-[1.8] prose-p:text-foreground",
                    "prose-headings:scroll-mt-24 prose-headings:font-bold prose-headings:text-foreground",
                    "prose-strong:font-semibold prose-strong:text-foreground",
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
                <h3 className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                  [ {t("nearbyTitle")} ]
                </h3>
                <div
                  className={[
                    "prose prose-slate max-w-none",
                    "prose-p:text-[15px] prose-p:leading-[1.8] prose-p:text-foreground",
                    "prose-headings:font-bold prose-headings:text-foreground",
                    "prose-strong:font-semibold prose-strong:text-foreground",
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
                      "prose-p:mt-0 prose-p:text-[15px] prose-p:leading-[1.8] prose-p:text-foreground",
                      "prose-strong:font-semibold prose-strong:text-foreground",
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
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
                  [ CASE STUDIES ]
                </p>
                <h2 className="mt-2 mb-4 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
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
        </div>
      </HomeLandingDayNight>
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
    <div className="relative border-2 border-border bg-muted px-5 py-6 sm:px-8 sm:py-7">
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-accent"
        aria-hidden
      />
      <div className="relative flex gap-4 pl-3 sm:pl-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center border-2 border-border bg-hero-void text-accent">
          <Sparkles className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
            [ {title} ]
          </p>
          <div className="mt-3 text-foreground">{children}</div>
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
        className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-border bg-hero-void text-accent"
        aria-hidden
      >
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
          [ {label} ]
        </p>
        <div className="mt-2 min-w-0 text-sm leading-relaxed text-foreground">
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
      <dt className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
        [ {label} ]
      </dt>
      <dd className="mt-1 text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

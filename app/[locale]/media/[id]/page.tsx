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
  getSimilarMediaFromCatalog,
  typeLabels,
} from "@/lib/media-data";
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
import { fetchPublicMediaCatalog, resolveMediaForDetail } from "@/lib/public-media-catalog";
import { resolvePerformanceMetrics } from "@/lib/media-performance";
import MediaDetailExtras from "@/components/media-detail-extras";
import MediaDetailPerformance from "@/components/media-detail-performance";
import MediaDetailPremiumPoints from "@/components/media-detail-premium-points";
import { TrafficCharts } from "@/components/media-detail/traffic-charts";
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
  const title =
    locale === "ko" ? `${media.name} | THINKAD` : `${media.nameEn} | THINKAD`;
  const won = media.keywordFilter
    ? Math.round(
        (media.keywordFilter.budgetMin + media.keywordFilter.budgetMax) / 2,
      )
    : media.price * 10_000;
  const description = media.keywordFilter
    ? locale === "ko"
      ? `${media.location} · ${media.keywordFilter.priceText}`
      : `${media.locationEn} · ${media.keywordFilter.priceText}`
    : locale === "ko"
      ? `${media.location} · ${won.toLocaleString()}원`
      : `${media.locationEn} · ₩${won.toLocaleString()}`;
  return { title, description };
}

export default async function MediaDetailPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const { id: idStr } = await params;
  const media = await resolveMediaForDetail(idStr);
  if (!media) notFound();

  const catalog = await fetchPublicMediaCatalog();
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

  return (
    <>
      <TrackMediaView mediaId={media.id} />
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
            <Link href="/media">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-2 text-slate-200 hover:bg-white/10 hover:text-white"
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                {t("back")}
              </Button>
            </Link>
            <MediaDetailAdminActions />
          </div>

          <div className="grid gap-6 pb-2 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1.3fr)] lg:items-end">
            <div className="min-w-0 space-y-3 text-white">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h1 className="break-words text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
                  {isKo ? media.name : (media.nameEn || media.name)}
                </h1>
                <Badge
                  variant="secondary"
                  className="shrink-0 border border-white/25 bg-white/15 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm sm:text-sm"
                >
                  <Eye className="mr-1 h-3.5 w-3.5 opacity-90" aria-hidden />
                  {t("visibilityBadge", {
                    score: performanceMetrics.visibilityScore,
                  })}
                </Badge>
              </div>
              {heroTags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {heroTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="border-gold/50 bg-black/25 px-2.5 py-0.5 text-[11px] font-semibold text-gold-light backdrop-blur-sm sm:text-xs"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              ) : null}
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-200 sm:text-base">
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                  {formatMediaLocationShort(media, isKo)}
                </span>
                {typeLabel ? (
                  <>
                    <span className="hidden text-slate-400 sm:inline" aria-hidden>
                      ·
                    </span>
                    <span className="font-medium text-gold">
                      {typeLabel}
                    </span>
                  </>
                ) : null}
              </p>
              {featuresText ? (
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-100/90">
                  {featuresText}
                </p>
              ) : null}
            </div>

            <aside className="min-w-0 rounded-2xl border border-white/15 bg-black/35 p-4 text-sm text-slate-100 shadow-lg shadow-black/40 backdrop-blur-md sm:p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <CoreFact
                  icon={CircleDollarSign}
                  label={t("priceTitle")}
                  value={
                    media.keywordFilter ? (
                      <>
                        {hasPriceOptions && primaryPriceOption ? (
                          <span className="block text-lg font-bold tabular-nums text-gold">
                            {formatCatalogPriceFieldWon(
                              primaryPriceOption.price,
                            )}
                          </span>
                        ) : (
                          <span className="block text-base font-bold tabular-nums text-gold sm:text-lg">
                            {formatMediaPriceWonWithSymbol(
                              media.keywordFilter.budgetMin,
                            )}{" "}
                            <span className="font-semibold text-slate-200/90">
                              ~
                            </span>{" "}
                            {formatMediaPriceWonWithSymbol(
                              media.keywordFilter.budgetMax,
                            )}
                          </span>
                        )}
                        <span className="mt-1 block text-xs font-medium text-gold-light/95">
                          {media.keywordFilter.priceText}
                        </span>
                        {hasPriceOptions ? (
                          <span className="mt-1 block text-[11px] text-slate-200/80">
                            {t("priceOptionsSummaryHint")}
                          </span>
                        ) : (
                          <span className="mt-0.5 block text-[11px] text-slate-200/75">
                            {periodLabel}
                          </span>
                        )}
                      </>
                    ) : hasPriceOptions && primaryPriceOption ? (
                      <>
                        <span className="block text-lg font-bold tabular-nums text-gold">
                          {formatCatalogPriceFieldWon(primaryPriceOption.price)}
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-200/90">
                          {primaryPricePeriodLabel} · {primaryPriceOption.label}
                        </span>
                        <span className="mt-1 block text-[11px] text-slate-200/75">
                          {t("priceOptionsSummaryHint")}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="block text-lg font-bold tabular-nums text-gold">
                          {formatCatalogPriceFieldWon(media.price)}
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-200/90">
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
                    <span className="block text-base font-semibold tabular-nums text-white">
                      {monthly.toLocaleString()}
                    </span>
                  }
                />
              </div>
            </aside>
          </div>
        </div>
      </MediaDetailHeroGallery>

      <div className="bg-card border-b border-border/60 sticky top-[72px] z-30 backdrop-blur-md bg-card/90 sm:static sm:bg-card sm:backdrop-blur-0">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate">
              관심 가는 매체라면 견적서에 담아보세요
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

      <section className="bg-white py-12 pb-28 sm:pb-32">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
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

          {media.keywordFilter ? (
            <MediaDetailPremiumPoints
              title={t("premiumPointsTitle")}
              items={media.keywordFilter.specialFeature ?? []}
            />
          ) : null}

          {keywordHints.length > 0 ? (
            <section
              aria-labelledby="media-detail-keyword-hints-heading"
              className="mt-8"
            >
              <p
                id="media-detail-keyword-hints-heading"
                className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-navy/45"
              >
                {t("keywordSearchTagsTitle")}
              </p>
              <div className="flex flex-wrap gap-2">
                {keywordHints.map((kw) => (
                  <span
                    key={kw}
                    className="rounded-full border border-navy/14 bg-gradient-to-b from-white to-slate-50 px-3.5 py-1.5 text-xs font-semibold text-navy/88 shadow-sm"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          <h2 className="mb-4 mt-12 text-lg font-bold text-navy">
            {t("coreInfoTitle")}
          </h2>
          <div className="rounded-2xl border border-navy/10 bg-white p-6 shadow-lg shadow-navy/5 sm:p-8">
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
                        <span className="break-all text-base font-semibold tabular-nums text-gold-dark sm:text-lg">
                          {formatCatalogPriceFieldWon(primaryPriceOption.price)}
                        </span>
                      ) : (
                        <span className="break-all text-base font-semibold tabular-nums text-gold-dark sm:text-lg">
                          {formatMediaPriceWonWithSymbol(
                            media.keywordFilter.budgetMin,
                          )}{" "}
                          ~{" "}
                          {formatMediaPriceWonWithSymbol(
                            media.keywordFilter.budgetMax,
                          )}
                        </span>
                      )}
                      <span className="mt-1 block text-sm font-semibold text-navy">
                        {media.keywordFilter.priceText}
                      </span>
                      <span className="mt-1 block text-xs font-normal text-muted-foreground">
                        {hasPriceOptions
                          ? t("priceOptionsSummaryHint")
                          : `${t("budgetRangeHint")} · ${t("priceUnitWon")} · ${periodLabel}`}
                      </span>
                    </>
                  ) : hasPriceOptions && primaryPriceOption ? (
                    <>
                      <span className="break-all text-base font-semibold tabular-nums text-gold-dark sm:text-lg">
                        {formatCatalogPriceFieldWon(primaryPriceOption.price)}
                      </span>
                      <span className="mt-1 block text-sm font-semibold text-navy">
                        {primaryPriceOption.label} ·{" "}
                        {t(
                          mediaDetailPricePeriodTranslationKey(
                            (primaryPriceOption.period as any) ??
                              media.pricePeriod,
                          ),
                        )}
                      </span>
                      <span className="mt-1 block text-xs font-normal text-muted-foreground">
                        {t("priceOptionsSummaryHint")}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="break-all text-base font-semibold tabular-nums text-gold-dark sm:text-lg">
                        {formatCatalogPriceFieldWon(media.price)}
                      </span>
                      <span className="mt-1 block text-xs font-normal text-muted-foreground">
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
                    <span className="block text-lg font-bold leading-tight text-navy sm:text-xl">
                      {monthly.toLocaleString()}
                    </span>
                    <span className="mt-0.5 block text-xs font-medium text-muted-foreground">
                      {t("monthly")}
                    </span>
                    <span className="mt-2 block text-sm text-muted-foreground">
                      {t("daily")}{" "}
                      {media.dailyFootTraffic.toLocaleString()}
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
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <h2
                  id="media-detail-price-options-heading"
                  className="text-xl font-bold tracking-tight text-navy sm:text-2xl"
                >
                  {t("priceOptionsSectionTitle")}
                </h2>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-navy/40">
                  THINKAD · OOH
                </p>
              </div>
              {media.keywordFilter?.priceText ? (
                <div className="mb-6 rounded-2xl border border-gold/35 bg-gradient-to-r from-gold/[0.12] via-amber-50/80 to-gold/[0.08] px-5 py-4 shadow-sm ring-1 ring-gold/20">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-gold-dark/90">
                    {isKo ? "안내 요금" : "Rate note"}
                  </p>
                  <p className="mt-1.5 text-sm font-semibold leading-relaxed text-navy">
                    {media.keywordFilter.priceText}
                  </p>
                </div>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                {priceOptions.map((opt, idx) => {
                  const periodKey = mediaDetailPricePeriodTranslationKey(
                    (opt.period as string | undefined) ?? media.pricePeriod,
                  );
                  return (
                    <article
                      key={`${opt.label}-${idx}`}
                      className="group relative flex flex-col overflow-hidden rounded-2xl border border-navy/[0.08] bg-gradient-to-b from-white to-slate-50/90 p-5 shadow-[0_8px_30px_rgba(18,26,58,0.06)] ring-1 ring-navy/[0.04] transition-shadow hover:shadow-[0_12px_40px_rgba(18,26,58,0.1)]"
                    >
                      <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-gradient-to-br from-gold/15 to-transparent opacity-80" />
                      <h3 className="relative pr-8 text-base font-bold leading-snug text-navy">
                        {opt.label}
                      </h3>
                      <p className="relative mt-4 text-2xl font-bold tabular-nums tracking-tight text-gold-dark sm:text-[1.65rem]">
                        {formatCatalogPriceKrwLong(opt.price, locale)}
                      </p>
                      <p className="relative mt-2 inline-flex w-fit items-center rounded-full border border-navy/10 bg-navy/[0.03] px-3 py-1 text-[11px] font-semibold text-navy/70">
                        {t(periodKey)}
                      </p>
                      {opt.description?.trim() ? (
                        <p className="relative mt-4 border-t border-navy/8 pt-4 text-sm leading-relaxed text-muted-foreground">
                          {opt.description}
                        </p>
                      ) : (
                        <p className="relative mt-4 border-t border-navy/8 pt-4 text-xs text-muted-foreground/70">
                          {isKo ? "상세 조건은 견적 시 안내드립니다." : "Terms confirmed at quote stage."}
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          ) : null}

          <h2 className="mb-4 mt-12 text-lg font-bold text-navy">
            {t("specsTitle")}
          </h2>
          <dl className="grid gap-3 rounded-xl border bg-white p-6 sm:grid-cols-2">
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

          <section
            aria-labelledby="media-detail-description-heading"
            className="mt-10 border-t border-navy/10 py-12"
          >
            <h2
              id="media-detail-description-heading"
              className="mb-10 text-xl font-bold tracking-tight text-navy sm:text-2xl"
            >
              {t("detailDescriptionTitle")}
            </h2>
            <div className="space-y-12">
              {overviewBody?.trim() ? (
                <div>
                  <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("placementOverviewTitle")}
                  </h3>
                  <div
                    className={[
                      "prose prose-slate max-w-none",
                      "prose-p:text-[15px] prose-p:leading-[1.8] prose-p:text-navy/88",
                      "prose-headings:scroll-mt-24 prose-headings:font-bold prose-headings:text-navy",
                      "prose-strong:font-semibold prose-strong:text-navy",
                    ].join(" ")}
                  >
                    <ProseParagraphs text={overviewBody} />
                  </div>
                </div>
              ) : null}
              <div>
                <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("historyTitle")}
                </h3>
                <div
                  className={[
                    "prose prose-slate max-w-none",
                    "prose-p:text-[15px] prose-p:leading-[1.8] prose-p:text-navy/88",
                    "prose-headings:scroll-mt-24 prose-headings:font-bold prose-headings:text-navy",
                    "prose-strong:font-semibold prose-strong:text-navy",
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
                <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("nearbyTitle")}
                </h3>
                <div
                  className={[
                    "prose prose-slate max-w-none",
                    "prose-p:text-[15px] prose-p:leading-[1.8] prose-p:text-navy/88",
                    "prose-headings:font-bold prose-headings:text-navy",
                    "prose-strong:font-semibold prose-strong:text-navy",
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
                      "prose-p:mt-0 prose-p:text-[15px] prose-p:leading-[1.8] prose-p:text-navy/90",
                      "prose-strong:font-semibold prose-strong:text-navy",
                    ].join(" ")}
                  >
                    <ProseParagraphs text={featuresText} />
                  </div>
                </EffectMemoCallout>
              ) : null}
            </div>
          </section>

          {caseStudyItems.length > 0 ? (
            <>
              <h2 className="mb-3 mt-12 text-lg font-bold text-navy">
                {t("caseStudiesTitle")}
              </h2>
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

          <MediaSimilarCarousel items={similar} isKo={isKo} title={t("similarTitle")} />
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
    <div className="relative overflow-hidden rounded-2xl border border-gold-dark/45 bg-gradient-to-br from-gold-light/50 via-white to-gold/18 px-5 py-6 shadow-md shadow-navy/[0.07] ring-1 ring-inset ring-white/60 sm:px-8 sm:py-7">
      <div
        className="pointer-events-none absolute inset-y-5 left-0 w-1 rounded-full bg-gradient-to-b from-gold-dark/75 to-gold-dark/20"
        aria-hidden
      />
      <div className="relative flex gap-4 pl-3 sm:pl-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy/[0.07] text-gold-dark">
          <Sparkles className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-navy/75">
            {title}
          </p>
          <div className="mt-3">{children}</div>
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
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gold/12 text-gold-dark"
        aria-hidden
      >
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <div className="mt-2 min-w-0 text-sm leading-relaxed text-navy">
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
      <dt className="text-xs font-semibold uppercase text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-navy">{value}</dd>
    </div>
  );
}

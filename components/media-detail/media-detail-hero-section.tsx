"use client";

import type { ReactNode } from "react";
import { ArrowLeft, Eye, MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { MediaDetailHeroGalleryV2 } from "@/components/media-detail/media-detail-hero-gallery-v2";
import { MediaInquiryDialog } from "@/components/media-detail/inquiry-dialog";
import { MediaFavoriteButton } from "@/components/media-favorite-button";
import { MediaQuoteCtaButton } from "@/components/media-quote-cta";
import MediaDetailAdminActions from "@/components/media-detail-admin-actions";
import { MediaDetailMobileChromeSync } from "@/components/mobile/media-detail-mobile-chrome-sync";
import type { MediaItem } from "@/lib/media-data";
import type { MediaPerformanceMetrics } from "@/lib/media-performance";
import { formatMonthlyImpressionsLabel } from "@/lib/ai-recommend-metrics";
import {
  formatCatalogPriceFieldWon,
  formatCpmKrw,
  formatMediaPriceWonWithSymbol,
  resolveMediaDisplayPrice,
} from "@/lib/media-price-format";
import { MediaPriceExclNote } from "@/components/media/media-price-excl-note";
import { MediaExecutionSummary, MediaTrustScoreBadge } from "@/components/media/media-trust-score";
import { MediaTrustBadges } from "@/components/media/media-trust-badges";
import { resolveMediaCpmWon } from "@/lib/compare-quote";
import { cn } from "@/lib/utils";

type Labels = {
  back: string;
  priceTitle: string;
  periodLabel: string;
  inquiry: string;
  quote: string;
  visibilityBadge: string;
  kpiExposure: string;
  kpiCpm: string;
  kpiVisibility: string;
  gallery: {
    close: string;
    prev: string;
    next: string;
    expand: string;
    clickHint: string;
  };
};

type Props = {
  media: MediaItem;
  isKo: boolean;
  typeLabel: string;
  locationShort: string;
  heroTags: string[];
  galleryImages: string[];
  heroImage: string;
  imageAlt: string;
  performanceMetrics: MediaPerformanceMetrics;
  labels: Labels;
  hasPriceOptions: boolean;
  primaryPriceOption?: { price: number; label: string; period?: string };
  className?: string;
};

function KpiChip({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-xl border dark:border-white/10 border-gray-200 dark:bg-white/5 bg-white px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-widest dark:text-white/40 text-gray-400">
        {label}
      </p>
      <p className="mt-1 font-display text-sm font-bold tabular-nums dark:text-white text-gray-900">
        {value}
      </p>
    </div>
  );
}

export function MediaDetailHeroSection({
  media,
  isKo,
  typeLabel,
  locationShort,
  heroTags,
  galleryImages,
  heroImage,
  imageAlt,
  performanceMetrics,
  labels,
  hasPriceOptions,
  primaryPriceOption,
  className,
}: Props) {
  const displayName = isKo ? media.name : media.nameEn || media.name;
  const locale = isKo ? "ko-KR" : "en-US";
  const displayPrice = resolveMediaDisplayPrice(media);
  const multiPriceOptions = (media.priceOptions?.length ?? 0) >= 2;
  const cpm = resolveMediaCpmWon({
    ...media,
    price: displayPrice.priceWon,
    pricePeriod: displayPrice.period,
  });
  const impressionsLabel = formatMonthlyImpressionsLabel(media, isKo);
  const shareDescription = isKo
    ? `${displayName} — THINKAD 매체 상세`
    : `${displayName} — THINKAD media detail`;

  const priceBlock = media.keywordFilter ? (
    hasPriceOptions && primaryPriceOption ? (
      <span className="font-sans text-3xl font-bold tabular-nums dark:text-white text-gray-900">
        {formatCatalogPriceFieldWon(primaryPriceOption.price)}
      </span>
    ) : (
      <span className="font-sans text-2xl font-bold tabular-nums dark:text-white text-gray-900 sm:text-3xl">
        {formatMediaPriceWonWithSymbol(media.keywordFilter.budgetMin)}{" "}
        <span className="dark:text-white/40 text-gray-400">~</span>{" "}
        {formatMediaPriceWonWithSymbol(media.keywordFilter.budgetMax)}
      </span>
    )
  ) : (
    // 카드와 동일 — priceOptions 포함 최저가(resolveMediaDisplayPrice). 옵션 2개 이상이면 ~/from.
    <span className="font-display text-3xl font-black tabular-nums dark:text-white text-gray-900">
      {!isKo && multiPriceOptions ? (
        <span className="text-lg font-bold dark:text-white/55 text-gray-500">
          from{" "}
        </span>
      ) : null}
      {formatCatalogPriceFieldWon(displayPrice.priceWon, locale)}
      {multiPriceOptions && isKo ? "~" : null}
    </span>
  );

  const mapFallback =
    media.lat && media.lng
      ? {
          id: media.id,
          name: displayName,
          lat: media.lat,
          lng: media.lng,
          price: Number(media.price ?? 0),
          type: media.type,
        }
      : null;

  return (
    <>
      <MediaDetailMobileChromeSync
        mediaId={media.id}
        title={displayName}
        shareDescription={shareDescription}
        imageUrl={heroImage}
      />
      <section className={cn("mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8", className)}>
      <div className="mb-5 hidden items-start justify-between gap-3 md:flex">
        <Link
          href="/media"
          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 font-display text-xs font-medium uppercase tracking-[0.18em] text-gray-700 transition hover:bg-gray-100 hover:text-gray-900 dark:border-white/15 dark:bg-white/8 dark:text-white/90 dark:hover:bg-white/12 dark:hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {labels.back}
        </Link>
        <MediaDetailAdminActions />
      </div>

      <div className="grid gap-8 lg:grid-cols-[3fr_2fr] lg:items-start">
        <MediaDetailHeroGalleryV2
          images={galleryImages}
          heroSrc={heroImage}
          altBase={imageAlt}
          labels={labels.gallery}
          mapFallback={mapFallback}
        />

        <div className="min-w-0 space-y-5">
          <div>
            <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-violet-500 dark:text-violet-300/80">
              {typeLabel}
            </p>
            <h1 className="mt-2 text-balance text-2xl font-black leading-tight tracking-tight dark:text-white text-gray-900 sm:text-3xl">
              {displayName}
            </h1>
            {heroTags.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {heroTags.slice(0, 5).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border dark:border-white/12 border-gray-200 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide dark:text-white/70 text-gray-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
            {media.trustBadges && media.trustBadges.length > 0 ? (
              <MediaTrustBadges
                badges={media.trustBadges}
                isKo={isKo}
                className="mt-3"
              />
            ) : null}
            {media.trustScore != null || media.executionCount != null ? (
              <div className="mt-3 space-y-1.5">
                {media.trustScore != null ? (
                  <MediaTrustScoreBadge score={media.trustScore} isKo={isKo} />
                ) : null}
                {media.executionCount != null ? (
                  <MediaExecutionSummary
                    count={media.executionCount}
                    monthsAgo={media.lastExecutionMonthsAgo ?? null}
                    isKo={isKo}
                  />
                ) : null}
              </div>
            ) : null}
            <p className="mt-3 flex items-center gap-2 text-sm dark:text-white/70 text-gray-600">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden />
              {locationShort}
            </p>
          </div>

          <div className="rounded-2xl border dark:border-white/10 border-gray-200 dark:bg-white/5 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest dark:text-white/40 text-gray-400">
              {labels.priceTitle}
            </p>
            <div className="mt-1">{priceBlock}</div>
            <p className="mt-1 text-[11px] dark:text-white/50 text-gray-500">
              {labels.periodLabel}
            </p>
            <MediaPriceExclNote isKo={isKo} className="mt-1" />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <KpiChip
              label={labels.kpiExposure}
              value={impressionsLabel ?? "—"}
            />
            <KpiChip
              label={labels.kpiCpm}
              value={
                cpm != null ? formatCpmKrw(Math.round(cpm), locale) : "—"
              }
            />
            <KpiChip
              label={labels.kpiVisibility}
              value={
                <span className="inline-flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" aria-hidden />
                  {performanceMetrics.visibilityScore}
                </span>
              }
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <MediaInquiryDialog
              mediaId={media.id}
              mediaName={displayName}
              triggerLabel={`${labels.inquiry} →`}
              className="w-full justify-center sm:flex-1"
            />
            <MediaQuoteCtaButton
              media={media}
              variant="inline"
              className="w-full justify-center sm:flex-1"
            />
            <MediaFavoriteButton
              mediaId={media.id}
              mediaName={media.name}
              mediaNameEn={media.nameEn}
              className="w-full justify-center sm:w-auto"
            />
          </div>
        </div>
      </div>
    </section>
    </>
  );
}

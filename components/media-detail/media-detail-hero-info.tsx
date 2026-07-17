import type { ReactNode } from "react";
import { ArrowLeft, Eye, MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";
import MediaDetailAdminActions from "@/components/media-detail-admin-actions";
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
import {
  MediaExecutionSummary,
  MediaTrustScoreBadge,
} from "@/components/media/media-trust-score";
import { MediaTrustBadges } from "@/components/media/media-trust-badges";
import { resolveMediaCpmWon } from "@/lib/compare-quote";
import { buildMediaHeroSpecBadges } from "@/lib/media-detail-hero-specs";
import { cn } from "@/lib/utils";

type Labels = {
  back: string;
  priceTitle: string;
  periodLabel: string;
  kpiExposure: string;
  kpiCpm: string;
  kpiVisibility: string;
  specSize: string;
  specResolution: string;
  specBrightness: string;
};

type Props = {
  media: MediaItem;
  isKo: boolean;
  typeLabel: string;
  locationShort: string;
  heroTags: string[];
  performanceMetrics: MediaPerformanceMetrics;
  labels: Labels;
  hasPriceOptions: boolean;
  primaryPriceOption?: { price: number; label: string; period?: string };
  actions: ReactNode;
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
      <p className="text-[length:var(--qp-text-meta)] font-semibold text-gray-600 dark:text-white/70">
        {label}
      </p>
      <p className="mt-1 font-display text-[length:var(--qp-text-body)] font-bold tabular-nums dark:text-white text-gray-900">
        {value}
      </p>
    </div>
  );
}

/** 히어로 h1·가격·KPI — 서버 렌더 (초기 HTML heading-order) */
export function MediaDetailHeroInfo({
  media,
  isKo,
  typeLabel,
  locationShort,
  heroTags,
  performanceMetrics,
  labels,
  hasPriceOptions,
  primaryPriceOption,
  actions,
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
  const specBadges = buildMediaHeroSpecBadges(media, {
    isKo,
    visibilityScore: performanceMetrics.visibilityScore,
    labels: {
      size: labels.specSize,
      resolution: labels.specResolution,
      visibility: labels.kpiVisibility,
      brightness: labels.specBrightness,
    },
  });

  const priceBlock = media.keywordFilter ? (
    hasPriceOptions && primaryPriceOption ? (
      <span className="font-sans text-[1.75rem] font-black tabular-nums leading-none text-[color:var(--qp-accent)]">
        {formatCatalogPriceFieldWon(primaryPriceOption.price)}
      </span>
    ) : (
      <span className="font-sans text-[1.75rem] font-black tabular-nums leading-none text-[color:var(--qp-accent)]">
        {formatMediaPriceWonWithSymbol(media.keywordFilter.budgetMin)}{" "}
        <span className="text-gray-400 dark:text-white/40">~</span>{" "}
        {formatMediaPriceWonWithSymbol(media.keywordFilter.budgetMax)}
      </span>
    )
  ) : (
    <span className="font-display text-[1.75rem] font-black tabular-nums leading-none text-[color:var(--qp-accent)]">
      {!isKo && multiPriceOptions ? (
        <span className="text-[length:var(--qp-text-meta)] font-bold text-gray-600 dark:text-white/70">
          from{" "}
        </span>
      ) : null}
      {formatCatalogPriceFieldWon(displayPrice.priceWon, locale)}
      {multiPriceOptions && isKo ? "~" : null}
    </span>
  );

  return (
    <div className={cn("min-w-0 space-y-5", className)}>
      <div>
        <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-[color:var(--qp-accent)] dark:text-[color:var(--qp-accent)]/80">
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
              <MediaTrustScoreBadge
                score={media.trustScore}
                isKo={isKo}
                className="!text-[length:var(--qp-text-meta)]"
              />
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
        <p className="mt-3 flex items-center gap-2 text-[length:var(--qp-text-meta)] text-gray-600 dark:text-white/70">
          <MapPin className="h-4 w-4 shrink-0" aria-hidden />
          {locationShort}
        </p>
      </div>

      <div className="rounded-2xl border dark:border-white/10 border-gray-200 dark:bg-white/5 bg-white p-4 shadow-sm">
        <p className="text-[length:var(--qp-text-meta)] font-semibold text-gray-600 dark:text-white/70">
          {labels.priceTitle}
        </p>
        <div className="mt-1">{priceBlock}</div>
        <p className="mt-1 text-[length:var(--qp-text-meta)] text-gray-600 dark:text-white/65">
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
          value={cpm != null ? formatCpmKrw(Math.round(cpm), locale) : "—"}
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

      {specBadges.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {specBadges.map((badge) => (
            <span
              key={badge.key}
              className="inline-flex max-w-full items-center gap-1 rounded-full border dark:border-white/12 border-gray-200 dark:bg-white/5 bg-gray-50 px-2.5 py-1 text-[length:var(--qp-text-meta)] dark:text-white/80 text-gray-700"
              title={`${badge.label}: ${badge.value}`}
            >
              <span className="shrink-0 font-semibold text-gray-600 dark:text-white/70">
                {badge.label}
              </span>
              <span className="truncate font-medium text-[length:var(--qp-text-body)]">{badge.value}</span>
            </span>
          ))}
        </div>
      ) : null}

      {actions}
    </div>
  );
}

type TopBarProps = {
  backLabel: string;
};

export function MediaDetailHeroTopBar({ backLabel }: TopBarProps) {
  return (
    <div className="mb-5 hidden items-start justify-between gap-3 md:flex">
      <Link
        href="/media"
        className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 font-display text-xs font-medium uppercase tracking-[0.18em] text-gray-700 transition hover:bg-gray-100 hover:text-gray-900 dark:border-white/15 dark:bg-white/8 dark:text-white/90 dark:hover:bg-white/12 dark:hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {backLabel}
      </Link>
      <MediaDetailAdminActions />
    </div>
  );
}

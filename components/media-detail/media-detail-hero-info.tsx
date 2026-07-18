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
import { cn } from "@/lib/utils";

type Labels = {
  back: string;
  priceTitle: string;
  periodLabel: string;
  kpiExposure: string;
  kpiCpm: string;
  kpiVisibility: string;
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
  /** 크기·유형·타깃만 — 해상도/시인성 등은 집행 탭에서 노출 */
  const summaryTags = heroTags.slice(0, 3);

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
    <div
      className={cn(
        "min-w-0 flex flex-col gap-[length:var(--qp-space-group)]",
        className,
      )}
    >
      {/* 그룹 1: 제목 + 핵심 태그 */}
      <div>
        <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-[color:var(--qp-accent)] dark:text-[color:var(--qp-accent)]/80">
          {typeLabel}
        </p>
        <h1 className="mt-2 text-balance text-2xl font-black leading-tight tracking-tight dark:text-white text-gray-900 sm:text-3xl">
          {displayName}
        </h1>
        {summaryTags.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {summaryTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border dark:border-white/12 border-gray-200 px-2.5 py-0.5 text-[length:var(--qp-text-meta)] font-semibold dark:text-white/70 text-gray-600"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {/* 그룹 2: 신뢰·집행·위치 */}
      {media.trustBadges?.length ||
      media.trustScore != null ||
      media.executionCount != null ||
      locationShort ? (
        <div className="space-y-[length:var(--qp-space-stack)] border-t border-gray-200 pt-[length:var(--qp-space-group)] dark:border-white/10">
          {media.trustBadges && media.trustBadges.length > 0 ? (
            <MediaTrustBadges badges={media.trustBadges} isKo={isKo} />
          ) : null}
          {media.trustScore != null || media.executionCount != null ? (
            <div className="space-y-1.5">
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
          <p className="flex items-center gap-2 text-[length:var(--qp-text-meta)] text-gray-600 dark:text-white/70">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden />
            {locationShort}
          </p>
        </div>
      ) : null}

      {/* 그룹 3: 가격 */}
      <div className="rounded-2xl border border-gray-200 bg-[color:var(--qp-surface-2)] p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
        <p className="text-[length:var(--qp-text-meta)] font-semibold text-gray-600 dark:text-white/70">
          {labels.priceTitle}
        </p>
        <div className="mt-2">{priceBlock}</div>
        <p className="mt-2 text-[length:var(--qp-text-meta)] text-gray-600 dark:text-white/65">
          {labels.periodLabel}
        </p>
        <MediaPriceExclNote isKo={isKo} className="mt-1" />
      </div>

      {/* 그룹 4: KPI */}
      <div className="grid grid-cols-3 gap-3">
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

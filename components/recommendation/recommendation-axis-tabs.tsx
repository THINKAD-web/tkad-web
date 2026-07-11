"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { LayoutGrid, LayoutList, Plus, X } from "lucide-react";
import type { MediaItem } from "@/lib/media-data";
import type { AiRecommendInput } from "@/lib/ai-media-recommend";
import type { ScoredMedia } from "@/lib/ai-media-recommend";
import {
  AXIS_SCORE_MAX,
  hasIndustryRankingSignal,
  rankPlannerMediaByAxis,
  rankRecommendMediaByAxis,
  visiblePlannerAxes,
  visibleRecommendAxes,
  type AxisRankedItem,
  type RecommendTabAxis,
} from "@/lib/planner/recommend-tabs";
import type { RecommendationContext } from "@/lib/planner/recommendation-context";
import { plannerNeon } from "@/components/planner/planner-neon-ui";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/ga-events";
import { PlannerMediaThumb } from "@/components/planner/planner-media-thumb";
import {
  RECOMMEND_MEDIA_GRID_CLASS,
  RecommendScoredMediaCard,
} from "@/components/media-ai-recommend-scored-card";
import { MediaCartAddButton } from "@/components/media/media-cart-add-button";
import { planCartItemFromMediaItem } from "@/lib/plan-cart-item-builders";

const TOP_N_OPTIONS = [5, 10, 20] as const;
type TopNOption = (typeof TOP_N_OPTIONS)[number];
type AxisViewMode = "list" | "cards";

type SharedProps = {
  isKo: boolean;
  seed?: number;
  className?: string;
};

type PlannerVariantProps = SharedProps & {
  variant: "planner";
  catalog: MediaItem[];
  ctx: RecommendationContext;
  locale: string;
  selectedIds: string[];
  setCampaignMediaIds: (updater: (prev: string[]) => string[]) => void;
  renderQuantityControl?: (media: MediaItem) => ReactNode;
  onCampaignToggleMedia?: (media: MediaItem, axisSource: string) => void;
};

type RecommendVariantProps = SharedProps & {
  variant: "recommend";
  catalog: MediaItem[];
  input: AiRecommendInput;
  regionCodes: readonly string[];
  locale: string;
  renderQuantityControl?: (media: MediaItem) => ReactNode;
};

export type RecommendationAxisTabsProps =
  | PlannerVariantProps
  | RecommendVariantProps;

function metricParts(metric: string): string[] {
  return metric.split(" · ").map((p) => p.trim()).filter(Boolean);
}

function axisRankedToScored(item: AxisRankedItem): ScoredMedia {
  return {
    item: item.media,
    score: item.axisScore,
    reasons: [{ ko: item.metricKo, en: item.metricEn }],
  };
}

function PlannerAxisList({
  effectiveAxis,
  ranked,
  industryWeak,
  isKo,
  selectedIds,
  setCampaignMediaIds,
  t,
}: {
  effectiveAxis: RecommendTabAxis;
  ranked: AxisRankedItem[];
  industryWeak: boolean;
  isKo: boolean;
  selectedIds: string[];
  setCampaignMediaIds: (updater: (prev: string[]) => string[]) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const isSelected = (id: string) => selectedIds.includes(id);
  const removeHint = isKo ? "다시 누르면 빼기" : "Tap again to remove";

  const handleToggle = (id: string) => {
    setCampaignMediaIds((prev) => {
      const adding = !prev.includes(id);
      if (adding) {
        trackEvent("add_to_plan", {
          media_id: id,
          source: `recommend_tab_${effectiveAxis}`,
        });
      }
      return adding ? [...prev, id] : prev.filter((x) => x !== id);
    });
  };

  if (ranked.length === 0) {
    return (
      <p className={cn("py-6 text-center text-sm", plannerNeon.subtext)}>
        {t("recommendTabsEmpty")}
      </p>
    );
  }

  if (industryWeak) {
    return (
      <p className={cn("py-6 text-center text-sm", plannerNeon.subtext)}>
        {t("recommendTabIndustryWeak")}
      </p>
    );
  }

  return (
    <ol className="min-w-0 divide-y dark:divide-white/8 divide-gray-100">
      {ranked.map((item) => {
        const selected = isSelected(item.media.id);
        const metric = isKo ? item.metricKo : item.metricEn;
        const parts = metricParts(metric);
        const axisPts =
          effectiveAxis === "budgetEfficiency"
            ? null
            : effectiveAxis === "industryFit"
              ? `${item.breakdown.industry}/${AXIS_SCORE_MAX.industryFit}`
              : effectiveAxis === "targetMatch"
                ? `${item.breakdown.target}/${AXIS_SCORE_MAX.targetMatch}`
                : `${item.breakdown.category}/${AXIS_SCORE_MAX.goalFit}`;

        return (
          <li
            key={item.media.id}
            className={cn(
              "grid min-w-0 grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-1 py-2.5 sm:gap-x-3",
              selected && "dark:bg-violet-500/5 bg-violet-50/50 -mx-2 rounded-lg px-2",
            )}
          >
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-xs font-bold tabular-nums text-violet-700 dark:text-violet-200"
              aria-label={isKo ? `${item.rank}위` : `Rank ${item.rank}`}
            >
              {item.rank}
            </span>
            <PlannerMediaThumb
              media={item.media}
              alt={isKo ? item.media.name : item.media.nameEn || item.media.name}
              size="rank"
            />
            <div className="min-w-0 overflow-hidden">
              <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                {isKo ? item.media.name : item.media.nameEn || item.media.name}
              </p>
              <div className="mt-0.5 flex w-full min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs tabular-nums text-muted-foreground">
                {parts.map((part) => (
                  <span key={part} className="shrink-0 whitespace-nowrap">
                    {part}
                  </span>
                ))}
              </div>
              {axisPts ? (
                <p className="mt-0.5 text-[11px] font-medium text-violet-600 dark:text-violet-300">
                  {t(`recommendTabScore.${effectiveAxis}`, { score: axisPts })}
                </p>
              ) : null}
              {selected ? (
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {t("recommendTabQtyHint")}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => handleToggle(item.media.id)}
              title={selected ? removeHint : t("recommendAddCampaignHint")}
              className={cn(
                "shrink-0 justify-center whitespace-nowrap",
                selected
                  ? "inline-flex items-center gap-1 rounded-full border border-rose-400/50 bg-rose-500/15 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-200"
                  : cn(plannerNeon.ctaSm, "py-1.5 px-3 text-xs"),
              )}
            >
              {selected ? (
                <>
                  <X className="h-3.5 w-3.5" aria-hidden />
                  {t("recommendRemove")}
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  {t("recommendAdd")}
                </>
              )}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function RecommendAxisList({
  ranked,
  industryWeak,
  isKo,
  t,
}: {
  ranked: AxisRankedItem[];
  industryWeak: boolean;
  isKo: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  if (ranked.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {t("recommendTabsEmpty")}
      </p>
    );
  }

  if (industryWeak) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {t("recommendTabIndustryWeak")}
      </p>
    );
  }

  return (
    <ol className="min-w-0 divide-y divide-border">
      {ranked.map((item) => {
        const metric = isKo ? item.metricKo : item.metricEn;
        const parts = metricParts(metric);
        return (
          <li
            key={item.media.id}
            className="grid min-w-0 grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-1 py-2.5 sm:gap-x-3"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-xs font-bold tabular-nums text-violet-700 dark:text-violet-200">
              {item.rank}
            </span>
            <PlannerMediaThumb
              media={item.media}
              alt={isKo ? item.media.name : item.media.nameEn || item.media.name}
              size="rank"
            />
            <div className="min-w-0 overflow-hidden">
              <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                {isKo ? item.media.name : item.media.nameEn || item.media.name}
              </p>
              <div className="mt-0.5 flex w-full min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs tabular-nums text-muted-foreground">
                {parts.map((part) => (
                  <span key={part} className="shrink-0 whitespace-nowrap">
                    {part}
                  </span>
                ))}
              </div>
            </div>
            <MediaCartAddButton
              item={planCartItemFromMediaItem(item.media, "ai_recommend")}
              addedFrom="ai_recommend"
              className="!h-8 !rounded-lg !px-2.5 !text-[11px]"
            />
          </li>
        );
      })}
    </ol>
  );
}

function PlannerAxisCardGrid({
  effectiveAxis,
  ranked,
  industryWeak,
  isKo,
  locale,
  selectedIds,
  setCampaignMediaIds,
  renderQuantityControl,
  onCampaignToggleMedia,
  t,
}: {
  effectiveAxis: RecommendTabAxis;
  ranked: AxisRankedItem[];
  industryWeak: boolean;
  isKo: boolean;
  locale: string;
  selectedIds: string[];
  setCampaignMediaIds: (updater: (prev: string[]) => string[]) => void;
  renderQuantityControl?: (media: MediaItem) => ReactNode;
  onCampaignToggleMedia?: (media: MediaItem, axisSource: string) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  if (ranked.length === 0) {
    return (
      <p className={cn("py-6 text-center text-sm", plannerNeon.subtext)}>
        {t("recommendTabsEmpty")}
      </p>
    );
  }

  if (industryWeak) {
    return (
      <p className={cn("py-6 text-center text-sm", plannerNeon.subtext)}>
        {t("recommendTabIndustryWeak")}
      </p>
    );
  }

  return (
    <ul className={RECOMMEND_MEDIA_GRID_CLASS}>
      {ranked.map((item) => {
        const selected = selectedIds.includes(item.media.id);
        return (
          <RecommendScoredMediaCard
            key={item.media.id}
            scored={axisRankedToScored(item)}
            rank={item.rank}
            isKo={isKo}
            locale={locale}
            plannerMode
            isInPlan={selected}
            planAddedFrom="planner"
            quantityControl={renderQuantityControl?.(item.media)}
            onTogglePlan={() => {
              if (onCampaignToggleMedia) {
                onCampaignToggleMedia(
                  item.media,
                  `recommend_tab_${effectiveAxis}`,
                );
                return;
              }
              setCampaignMediaIds((prev) => {
                const adding = !prev.includes(item.media.id);
                if (adding) {
                  trackEvent("add_to_plan", {
                    media_id: item.media.id,
                    source: `recommend_tab_${effectiveAxis}`,
                  });
                }
                return adding
                  ? [...prev, item.media.id]
                  : prev.filter((x) => x !== item.media.id);
              });
            }}
          />
        );
      })}
    </ul>
  );
}

function RecommendAxisCardGrid({
  ranked,
  industryWeak,
  isKo,
  locale,
  renderQuantityControl,
  t,
}: {
  ranked: AxisRankedItem[];
  industryWeak: boolean;
  isKo: boolean;
  locale: string;
  renderQuantityControl?: (media: MediaItem) => ReactNode;
  t: ReturnType<typeof useTranslations>;
}) {
  if (ranked.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {t("recommendTabsEmpty")}
      </p>
    );
  }

  if (industryWeak) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {t("recommendTabIndustryWeak")}
      </p>
    );
  }

  return (
    <ul className={RECOMMEND_MEDIA_GRID_CLASS}>
      {ranked.map((item) => (
        <RecommendScoredMediaCard
          key={item.media.id}
          scored={axisRankedToScored(item)}
          rank={item.rank}
          isKo={isKo}
          locale={locale}
          quantityControl={renderQuantityControl?.(item.media)}
        />
      ))}
    </ul>
  );
}

export function RecommendationAxisTabs(props: RecommendationAxisTabsProps) {
  const t = useTranslations("planner");
  const { isKo, seed = 0, className } = props;
  const isPlanner = props.variant === "planner";

  const axes = useMemo(
    () =>
      isPlanner
        ? visiblePlannerAxes(props.ctx)
        : visibleRecommendAxes(props.input),
    [isPlanner, props],
  );

  const [activeAxis, setActiveAxis] = useState<RecommendTabAxis>(
    axes[0] ?? "budgetEfficiency",
  );
  const [topN, setTopN] = useState<TopNOption>(10);
  const [viewMode, setViewMode] = useState<AxisViewMode>(
    isPlanner ? "list" : "cards",
  );

  const effectiveAxis = axes.includes(activeAxis) ? activeAxis : axes[0]!;

  const catalog = props.catalog;
  const rankedByAxis = useMemo(() => {
    const out = {} as Record<RecommendTabAxis, AxisRankedItem[]>;
    for (const axis of axes) {
      if (props.variant === "planner") {
        out[axis] = rankPlannerMediaByAxis(
          catalog,
          props.ctx,
          axis,
          topN,
          seed,
        );
      } else {
        out[axis] = rankRecommendMediaByAxis(
          catalog,
          props.input,
          props.regionCodes,
          axis,
          topN,
          seed,
        );
      }
    }
    return out;
  }, [axes, catalog, seed, topN, props]);

  const ranked = rankedByAxis[effectiveAxis] ?? [];
  const industryWeak =
    effectiveAxis === "industryFit" && !hasIndustryRankingSignal(ranked);

  if (axes.length === 0) return null;

  const shellClass = cn(
    "min-w-0 space-y-4",
    isPlanner
      ? "border-t dark:border-white/10 border-gray-100 pt-6"
      : "border-2 border-border bg-card p-5 sm:p-6",
    className,
  );

  const eyebrowClass = isPlanner
    ? cn("text-xs font-semibold uppercase tracking-wider", plannerNeon.subtext)
    : "font-display text-xs font-medium uppercase tracking-[0.22em] text-accent";

  const headingClass = isPlanner
    ? cn("text-base font-semibold", plannerNeon.headline)
    : "text-base font-bold tracking-tight text-foreground sm:text-lg";

  const descClass = isPlanner
    ? cn("text-sm", plannerNeon.subtext)
    : "text-[11px] tracking-tight text-muted-foreground sm:text-xs";

  const controlBtn = (active: boolean) =>
    cn(
      "inline-flex items-center justify-center gap-1 rounded-full border px-2.5 py-1.5 text-xs font-semibold transition-colors",
      active
        ? "border-violet-400/60 bg-violet-500/15 text-violet-700 dark:text-violet-200"
        : "border-border bg-background text-muted-foreground hover:border-violet-300/40",
    );

  return (
    <div className={shellClass}>
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className={eyebrowClass}>{t("recommendTabsEyebrow")}</p>
          <h4 className={headingClass}>
            {t("recommendTabsHeadingDynamic", { n: topN })}
          </h4>
          <p className={descClass}>
            {isPlanner ? t("recommendTabsDesc") : `// ${t("recommendTabsDesc")}`}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <div
            className="flex items-center gap-1"
            role="group"
            aria-label={t("recommendTabsTopNLabel")}
          >
            {TOP_N_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setTopN(n)}
                className={controlBtn(topN === n)}
                aria-pressed={topN === n}
              >
                Top {n}
              </button>
            ))}
          </div>
          <div
            className="flex items-center gap-1"
            role="group"
            aria-label={t("recommendTabsViewLabel")}
          >
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={controlBtn(viewMode === "list")}
              aria-pressed={viewMode === "list"}
              title={t("recommendTabsViewList")}
            >
              <LayoutList className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">{t("recommendTabsViewList")}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={controlBtn(viewMode === "cards")}
              aria-pressed={viewMode === "cards"}
              title={t("recommendTabsViewCards")}
            >
              <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">{t("recommendTabsViewCards")}</span>
            </button>
          </div>
        </div>
      </div>

      <div
        className="-mx-1 flex min-w-0 gap-2 overflow-x-auto px-1 pb-1 scrollbar-thin"
        role="tablist"
        aria-label={t("recommendTabsHeading")}
      >
        {axes.map((axis) => (
          <button
            key={axis}
            type="button"
            role="tab"
            aria-selected={effectiveAxis === axis}
            onClick={() => setActiveAxis(axis)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors sm:px-4 sm:text-sm",
              effectiveAxis === axis
                ? "border-violet-400/60 bg-violet-500/15 text-violet-700 dark:text-violet-200"
                : "dark:border-white/12 border-gray-200 dark:bg-white/5 bg-white text-muted-foreground hover:border-violet-300/40",
            )}
          >
            {t(`recommendTab.${axis}`)}
          </button>
        ))}
      </div>

      {effectiveAxis === "industryFit" ? (
        <p className={cn("text-xs", isPlanner ? plannerNeon.subtext : "text-muted-foreground")}>
          {t("recommendTabIndustryNote")}
        </p>
      ) : null}

      {isPlanner ? (
        viewMode === "list" ? (
          <PlannerAxisList
            effectiveAxis={effectiveAxis}
            ranked={ranked}
            industryWeak={industryWeak}
            isKo={isKo}
            selectedIds={props.selectedIds}
            setCampaignMediaIds={props.setCampaignMediaIds}
            t={t}
          />
        ) : (
          <PlannerAxisCardGrid
            effectiveAxis={effectiveAxis}
            ranked={ranked}
            industryWeak={industryWeak}
            isKo={isKo}
            locale={props.locale}
            selectedIds={props.selectedIds}
            setCampaignMediaIds={props.setCampaignMediaIds}
            renderQuantityControl={props.renderQuantityControl}
            onCampaignToggleMedia={props.onCampaignToggleMedia}
            t={t}
          />
        )
      ) : viewMode === "list" ? (
        <RecommendAxisList
          ranked={ranked}
          industryWeak={industryWeak}
          isKo={isKo}
          t={t}
        />
      ) : (
        <RecommendAxisCardGrid
          ranked={ranked}
          industryWeak={industryWeak}
          isKo={isKo}
          locale={props.locale}
          renderQuantityControl={props.renderQuantityControl}
          t={t}
        />
      )}
    </div>
  );
}

/** @deprecated import `RecommendationAxisTabs` from `@/components/recommendation/recommendation-axis-tabs` */
export function PlannerRecommendationAxisTabs(
  props: Omit<PlannerVariantProps, "variant">,
) {
  return <RecommendationAxisTabs variant="planner" {...props} />;
}

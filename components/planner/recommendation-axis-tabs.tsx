"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Plus } from "lucide-react";
import type { MediaItem } from "@/lib/media-data";
import {
  AXIS_SCORE_MAX,
  hasIndustryRankingSignal,
  isIndustryTabAvailable,
  rankPlannerMediaByAxis,
  RECOMMEND_TAB_AXES,
  type AxisRankedItem,
  type RecommendTabAxis,
} from "@/lib/planner/recommend-tabs";
import type { RecommendationContext } from "@/lib/planner/recommendation-context";
import { plannerNeon } from "@/components/planner/planner-neon-ui";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/ga-events";
import { PlannerMediaThumb } from "@/components/planner/planner-media-thumb";

type Props = {
  catalog: MediaItem[];
  ctx: RecommendationContext;
  isKo: boolean;
  seed?: number;
  selectedIds: string[];
  setCampaignMediaIds: (updater: (prev: string[]) => string[]) => void;
};

function visibleAxes(ctx: RecommendationContext): RecommendTabAxis[] {
  return RECOMMEND_TAB_AXES.filter(
    (axis) => axis !== "industryFit" || isIndustryTabAvailable(ctx),
  );
}

function metricParts(metric: string): string[] {
  return metric.split(" · ").map((p) => p.trim()).filter(Boolean);
}

export function PlannerRecommendationAxisTabs({
  catalog,
  ctx,
  isKo,
  seed = 0,
  selectedIds,
  setCampaignMediaIds,
}: Props) {
  const t = useTranslations("planner");
  const axes = useMemo(() => visibleAxes(ctx), [ctx]);
  const [activeAxis, setActiveAxis] = useState<RecommendTabAxis>(
    axes[0] ?? "budgetEfficiency",
  );

  const effectiveAxis = axes.includes(activeAxis) ? activeAxis : axes[0]!;

  const rankedByAxis = useMemo(() => {
    const out = {} as Record<RecommendTabAxis, AxisRankedItem[]>;
    for (const axis of axes) {
      out[axis] = rankPlannerMediaByAxis(catalog, ctx, axis, 10, seed);
    }
    return out;
  }, [catalog, ctx, axes, seed]);

  const ranked = rankedByAxis[effectiveAxis] ?? [];
  const industryWeak =
    effectiveAxis === "industryFit" && !hasIndustryRankingSignal(ranked);

  const isSelected = (id: string) => selectedIds.includes(id);

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

  if (axes.length === 0) return null;

  return (
    <div className="min-w-0 space-y-4 border-t dark:border-white/10 border-gray-100 pt-6">
      <div className="min-w-0 space-y-1">
        <p className={cn("text-xs font-semibold uppercase tracking-wider", plannerNeon.subtext)}>
          {t("recommendTabsEyebrow")}
        </p>
        <h4 className={cn("text-base font-semibold", plannerNeon.headline)}>
          {t("recommendTabsHeading")}
        </h4>
        <p className={cn("text-sm", plannerNeon.subtext)}>{t("recommendTabsDesc")}</p>
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
        <p className={cn("text-xs", plannerNeon.subtext)}>
          {t("recommendTabIndustryNote")}
        </p>
      ) : null}

      {ranked.length === 0 ? (
        <p className={cn("py-6 text-center text-sm", plannerNeon.subtext)}>
          {t("recommendTabsEmpty")}
        </p>
      ) : industryWeak ? (
        <p className={cn("py-6 text-center text-sm", plannerNeon.subtext)}>
          {t("recommendTabIndustryWeak")}
        </p>
      ) : (
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
                    {isKo
                      ? item.media.name
                      : item.media.nameEn || item.media.name}
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
                  title={t("recommendAddCampaignHint")}
                  className={cn(
                    "shrink-0 justify-center whitespace-nowrap",
                    selected
                      ? cn(plannerNeon.selectChip, plannerNeon.selectChipActive, "py-1.5 px-3 text-xs")
                      : cn(plannerNeon.ctaSm, "py-1.5 px-3 text-xs"),
                  )}
                >
                  {selected ? (
                    <>
                      <Check className="h-3.5 w-3.5" aria-hidden />
                      {t("recommendAdded")}
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
      )}
    </div>
  );
}

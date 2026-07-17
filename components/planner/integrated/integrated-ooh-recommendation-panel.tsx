"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Sparkles, Plus, Check, RefreshCw, Eye } from "lucide-react";
import type { MediaItem } from "@/lib/media-data";
import {
  recommendPlannerMedia,
  type RecommendReasonKey,
  type ScoredMedia,
} from "@/lib/planner/recommend";
import {
  selectIntegratedBudgetNum,
  useIntegratedPlannerStore,
} from "@/lib/planner/integrated-store";
import {
  PlannerNeonCard,
  PlannerNeonLabel,
  plannerNeon,
} from "@/components/planner/planner-neon-ui";
import { cn } from "@/lib/utils";
import {
  estimatedCpmWon,
  estimatedMonthlyImpressions,
} from "@/lib/ai-recommend-metrics";
import { normalizeVisibilityScore } from "@/lib/planner-logic";
import { formatCpmKrw } from "@/lib/media-price-format";

const REASON_COLORS: Record<RecommendReasonKey, string> = {
  matchRegion: "border-border bg-card text-foreground",
  ageMatch: "border-primary bg-primary text-primary-foreground",
  budgetEfficient: "border-border bg-muted text-foreground",
  goalFit: "border-primary/55 bg-primary/12 text-primary",
  industryFit: "border-[color:var(--qp-accent)]/55 bg-[color:var(--qp-accent)]/12 text-[color:var(--qp-accent)] dark:text-[color:var(--qp-accent)]",
  highVisibility: "border-primary bg-card text-primary",
  landmarkHotspot: "border-[#ff6200] bg-[#ff6200]/10 text-[#ff6200]",
  transitHotspot: "border-accent bg-accent/10 text-accent",
  retailHotspot: "border-emerald-500 bg-emerald-500/10 text-emerald-700",
  neighborhoodHotspot: "border-border bg-muted text-foreground",
};

type Props = {
  catalog: MediaItem[];
  isKo: boolean;
  regionLabel: (region: string) => string;
};

export function IntegratedOohRecommendationPanel({
  catalog,
  isKo,
  regionLabel,
}: Props) {
  const t = useTranslations("planner");
  const goal = useIntegratedPlannerStore((s) => s.campaignGoal);
  const regions = useIntegratedPlannerStore((s) => s.regions);
  const categories = useIntegratedPlannerStore((s) => s.categories);
  const ageKeys = useIntegratedPlannerStore((s) => s.ageKeys);
  const industryKey = useIntegratedPlannerStore((s) => s.industryKey);
  const budgetMan = useIntegratedPlannerStore(selectIntegratedBudgetNum);
  const months = useIntegratedPlannerStore((s) => s.months);
  const selectedIds = useIntegratedPlannerStore((s) => s.campaignMediaIds);
  const setCampaignMediaIds = useIntegratedPlannerStore(
    (s) => s.setCampaignMediaIds,
  );

  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);

  const depsKey = useMemo(
    () =>
      `${goal ?? ""}|${regions.join(",")}|${categories.join(",")}|${ageKeys.join(",")}|${industryKey}|${budgetMan}|${months}|${refreshTick}`,
    [goal, regions, categories, ageKeys, industryKey, budgetMan, months, refreshTick],
  );

  useEffect(() => {
    const show = requestAnimationFrame(() => setLoading(true));
    const hide = window.setTimeout(() => setLoading(false), 900);
    return () => {
      cancelAnimationFrame(show);
      window.clearTimeout(hide);
    };
  }, [depsKey]);

  const recommendations = useMemo<ScoredMedia[]>(
    () =>
      recommendPlannerMedia(
        catalog,
        { goal, regions, categories, ageKeys, industryKey, budgetMan, months },
        5,
        refreshTick,
      ),
    [catalog, goal, regions, categories, ageKeys, industryKey, budgetMan, months, refreshTick],
  );

  const isSelected = (id: string) => selectedIds.includes(id);

  return (
    <PlannerNeonCard className="border-[color:var(--qp-accent)]/20">
      <div className="flex flex-col gap-3 border-b dark:border-white/10 border-gray-100 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="space-y-1">
          <PlannerNeonLabel>{t("recommendEyebrow")}</PlannerNeonLabel>
          <h3 className={cn("text-lg font-bold", plannerNeon.headline)}>
            {t("recommendHeading")}
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setRefreshTick((n) => n + 1)}
          className={cn(plannerNeon.selectChip, plannerNeon.selectChipIdle)}
        >
          <RefreshCw className={cn("mr-1.5 inline h-3.5 w-3.5", loading && "animate-spin")} />
          {t("recommendRefresh")}
        </button>
      </div>
      <ul className="divide-y dark:divide-white/8 divide-gray-100">
        {recommendations.map((row) => {
          const m = row.media;
          const active = isSelected(m.id);
          const cpm = estimatedCpmWon(m);
          const imp = estimatedMonthlyImpressions(m);
          return (
            <li key={m.id}>
              <div className="flex items-start gap-3 px-5 py-4 sm:px-6">
                <button
                  type="button"
                  onClick={() =>
                    setCampaignMediaIds((prev) =>
                      prev.includes(m.id)
                        ? prev.filter((x) => x !== m.id)
                        : [...prev, m.id],
                    )
                  }
                  className={cn(
                    "mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2",
                    active
                      ? "border-[color:var(--qp-accent)] bg-[color:var(--qp-accent)] text-white"
                      : "border-border bg-card hover:border-[color:var(--qp-accent)]",
                  )}
                >
                  {active ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{m.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {regionLabel(m.region ?? "")} · {m.type}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {row.reasons.slice(0, 3).map((r) => (
                      <span
                        key={r.key}
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                          REASON_COLORS[r.key],
                        )}
                      >
                        {t(`recommendReason.${r.key}`)}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {imp.toLocaleString()} / {isKo ? "월" : "mo"}
                    </span>
                    {cpm ? <span>CPM {formatCpmKrw(cpm, isKo ? "ko" : "en")}</span> : null}
                    <span>
                      {isKo ? "가시성" : "Visibility"}{" "}
                      {normalizeVisibilityScore(m.visibilityScore ?? 0)}
                    </span>
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="border-t dark:border-white/8 border-gray-100 p-4">
        <button
          type="button"
          onClick={() => {
            setCampaignMediaIds((prev) => {
              const merged = new Set(prev);
              for (const r of recommendations) merged.add(r.media.id);
              return [...merged];
            });
          }}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-xl border border-[color:var(--qp-accent)]/30 bg-[color:var(--qp-accent)]/10 py-2.5 text-sm font-bold text-[color:var(--qp-accent)] dark:text-[color:var(--qp-accent)]",
          )}
        >
          <Sparkles className="h-4 w-4" />
          {t("recommendAddAll")}
        </button>
      </div>
    </PlannerNeonCard>
  );
}

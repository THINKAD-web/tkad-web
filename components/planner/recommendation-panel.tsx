"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Sparkles, Plus, Check, RefreshCw } from "lucide-react";
import type { MediaItem } from "@/lib/media-data";
import {
  recommendPlannerMedia,
  type RecommendReasonKey,
  type ScoredMedia,
} from "@/lib/planner/recommend";
import {
  selectBudgetNum,
  usePlannerStore,
} from "@/lib/planner/store";
import { BtnBlock } from "@/components/brutalist";
import { cn } from "@/lib/utils";

const REASON_COLORS: Record<RecommendReasonKey, string> = {
  matchRegion: "border-border bg-card text-foreground",
  ageMatch: "border-primary bg-primary text-primary-foreground",
  budgetEfficient: "border-border bg-muted text-foreground",
  /** was bg-foreground + text-primary → 라이트에서 잉크 배경에 잉크 글자, 플래너 토큰에서도 대비 붕괴 */
  goalFit: "border-primary/55 bg-primary/12 text-primary",
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
  /** 추천 개수 상한 (기본 5) */
  limit?: number;
};

export function PlannerRecommendationPanel({
  catalog,
  isKo,
  regionLabel,
  limit = 5,
}: Props) {
  const t = useTranslations("planner");
  const goal = usePlannerStore((s) => s.campaignGoal);
  const regions = usePlannerStore((s) => s.regions);
  const categories = usePlannerStore((s) => s.categories);
  const ageKey = usePlannerStore((s) => s.ageKey);
  const industryKey = usePlannerStore((s) => s.industryKey);
  const budgetMan = usePlannerStore(selectBudgetNum);
  const months = usePlannerStore((s) => s.months);
  const selectedIds = usePlannerStore((s) => s.campaignMediaIds);
  const setCampaignMediaIds = usePlannerStore((s) => s.setCampaignMediaIds);

  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);

  const depsKey = useMemo(
    () =>
      `${goal ?? ""}|${regions.join(",")}|${categories.join(",")}|${ageKey}|${industryKey}|${budgetMan}|${months}|${refreshTick}`,
    [
      goal,
      regions,
      categories,
      ageKey,
      industryKey,
      budgetMan,
      months,
      refreshTick,
    ],
  );

  useEffect(() => {
    const show = requestAnimationFrame(() => {
      setLoading(true);
    });
    const hide = window.setTimeout(() => setLoading(false), 1200);
    return () => {
      cancelAnimationFrame(show);
      window.clearTimeout(hide);
    };
  }, [depsKey]);

  const recommendations = useMemo<ScoredMedia[]>(
    () =>
      recommendPlannerMedia(
        catalog,
        {
          goal,
          regions,
          categories,
          ageKey,
          industryKey,
          budgetMan,
          months,
        },
        limit,
        refreshTick,
      ),
    [
      catalog,
      goal,
      regions,
      categories,
      ageKey,
      industryKey,
      budgetMan,
      months,
      limit,
      refreshTick,
    ],
  );

  // 분석 애니메이션: depsKey 변경 시 위 effect에서 로딩 재생.

  const isSelected = (id: string) => selectedIds.includes(id);

  const handleToggle = (id: string) => {
    setCampaignMediaIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleAddAll = () => {
    setCampaignMediaIds((prev) => {
      const merged = new Set(prev);
      for (const r of recommendations) merged.add(r.media.id);
      return [...merged];
    });
  };

  return (
    <div className="border-2 border-primary bg-card">
      <div className="flex flex-col gap-3 border-b-2 border-border p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
            [ AI RECOMMENDATIONS ]
          </p>
          <h3 className="flex items-center gap-2 text-lg font-bold tracking-tight text-foreground">
            <Sparkles className="h-5 w-5 text-primary" aria-hidden />
            {t("recommendHeading")}
          </h3>
          <p className="font-mono text-[11px] tracking-tight text-muted-foreground">
            {t("recommendDesc")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <BtnBlock
            variant="secondary"
            size="sm"
            onClick={() => setRefreshTick((n) => n + 1)}
            disabled={loading}
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", loading && "animate-spin")}
              aria-hidden
            />
            {t("recommendRefresh")}
          </BtnBlock>
          <BtnBlock
            variant="accent"
            size="sm"
            onClick={handleAddAll}
            disabled={loading || recommendations.length === 0}
          >
            {t("recommendAddAll")}
          </BtnBlock>
        </div>
      </div>
      <div className="p-5">
        {loading ? (
          <div
            className="flex items-center justify-center gap-3 py-10 font-mono text-[12px] uppercase tracking-[0.18em] text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            <span className="inline-block h-4 w-4 animate-spin border-2 border-primary border-t-transparent" />
            {`// `}{t("recommendLoading")}
          </div>
        ) : recommendations.length === 0 ? (
          <p className="py-10 text-center font-mono text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
            {`// `}{t("recommendEmpty")}
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-0 sm:grid-cols-2 lg:grid-cols-3">
            {recommendations.map(({ media, reasons }) => {
              const selected = isSelected(media.id);
              return (
                <li
                  key={media.id}
                  className={cn(
                    "-mt-[2px] -ml-[2px] flex flex-col gap-2 border-2 p-4 transition-colors",
                    selected
                      ? "border-primary bg-muted"
                      : "border-border bg-card hover:bg-muted",
                  )}
                >
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm font-bold leading-snug tracking-tight text-foreground">
                      {isKo ? media.name : media.nameEn || media.name}
                    </p>
                    <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      {`// `}{regionLabel(media.region)} ·{" "}
                      {(isKo
                        ? media.location
                        : media.locationEn || media.location
                      ).slice(0, 28)}
                    </p>
                  </div>
                  {reasons.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {reasons.map((r) => (
                        <span
                          key={r.key}
                          className={cn(
                            "border-2 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em]",
                            REASON_COLORS[r.key],
                          )}
                        >
                          {t(`recommendReason.${r.key}`)}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <BtnBlock
                    variant={selected ? "secondary" : "accent"}
                    size="sm"
                    onClick={() => handleToggle(media.id)}
                    className="mt-auto"
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
                  </BtnBlock>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

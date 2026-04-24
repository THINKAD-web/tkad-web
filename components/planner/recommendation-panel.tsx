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
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const REASON_COLORS: Record<RecommendReasonKey, string> = {
  matchRegion: "bg-navy/10 text-navy border-navy/20",
  ageMatch: "bg-gold/10 text-gold-dark border-gold/30",
  budgetEfficient: "bg-emerald-50 text-emerald-800 border-emerald-200",
  goalFit: "bg-indigo-50 text-indigo-800 border-indigo-200",
  highVisibility: "bg-amber-50 text-amber-900 border-amber-200",
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
  const budgetMan = usePlannerStore(selectBudgetNum);
  const months = usePlannerStore((s) => s.months);
  const selectedIds = usePlannerStore((s) => s.campaignMediaIds);
  const setCampaignMediaIds = usePlannerStore((s) => s.setCampaignMediaIds);

  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);

  const recommendations = useMemo<ScoredMedia[]>(
    () =>
      recommendPlannerMedia(
        catalog,
        {
          goal,
          regions,
          categories,
          ageKey,
          budgetMan,
          months,
        },
        limit,
      ),
    [catalog, goal, regions, categories, ageKey, budgetMan, months, limit],
  );

  // 분석 애니메이션 (UX 몰입용 1.2초). 입력이 바뀌거나 refresh 시 loading 재개.
  // render 단에서 입력 스냅샷을 추적해 effect 내부 setState 체인을 피함.
  const depsKey = `${goal ?? ""}|${regions.join(",")}|${categories.join(
    ",",
  )}|${ageKey}|${refreshTick}`;
  const [loadingKey, setLoadingKey] = useState(depsKey);
  if (loadingKey !== depsKey) {
    setLoadingKey(depsKey);
    setLoading(true);
  }
  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 1200);
    return () => window.clearTimeout(timer);
  }, [loadingKey]);

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
    <Card className="border-gold/30 bg-gradient-to-br from-gold/5 via-transparent to-transparent shadow-lg">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-navy">
            <Sparkles className="h-5 w-5 text-gold" aria-hidden />
            {t("recommendHeading")}
          </CardTitle>
          <CardDescription>{t("recommendDesc")}</CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full border-navy/20"
            onClick={() => setRefreshTick((n) => n + 1)}
            disabled={loading}
          >
            <RefreshCw
              className={cn("mr-1.5 h-3.5 w-3.5", loading && "animate-spin")}
              aria-hidden
            />
            {t("recommendRefresh")}
          </Button>
          <Button
            type="button"
            size="sm"
            className="btn-gold rounded-full"
            onClick={handleAddAll}
            disabled={loading || recommendations.length === 0}
          >
            {t("recommendAddAll")}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div
            className="flex items-center justify-center gap-3 py-10 text-sm text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-gold border-t-transparent" />
            {t("recommendLoading")}
          </div>
        ) : recommendations.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {t("recommendEmpty")}
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recommendations.map(({ media, reasons }) => {
              const selected = isSelected(media.id);
              return (
                <li
                  key={media.id}
                  className={cn(
                    "flex flex-col gap-2 rounded-xl border bg-card p-3 shadow-sm transition",
                    selected
                      ? "border-gold/50 ring-2 ring-gold/30"
                      : "border-navy/10 hover:border-gold/40",
                  )}
                >
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm font-bold text-navy">
                      {isKo ? media.name : media.nameEn || media.name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {regionLabel(media.region)} ·{" "}
                      {(isKo
                        ? media.location
                        : media.locationEn || media.location
                      ).slice(0, 28)}
                    </p>
                  </div>
                  {reasons.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {reasons.map((r) => (
                        <Badge
                          key={r.key}
                          variant="outline"
                          className={cn(
                            "rounded-full border text-[10px] font-semibold",
                            REASON_COLORS[r.key],
                          )}
                        >
                          {t(`recommendReason.${r.key}`)}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant={selected ? "outline" : "default"}
                    className={cn(
                      "mt-auto rounded-full",
                      !selected && "btn-gold border-0",
                    )}
                    onClick={() => handleToggle(media.id)}
                  >
                    {selected ? (
                      <>
                        <Check className="mr-1 h-3.5 w-3.5" aria-hidden />
                        {t("recommendAdded")}
                      </>
                    ) : (
                      <>
                        <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
                        {t("recommendAdd")}
                      </>
                    )}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

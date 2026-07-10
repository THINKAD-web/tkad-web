"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Sparkles, Plus, Check, RefreshCw } from "lucide-react";
import type { MediaItem } from "@/lib/media-data";
import { trackEvent } from "@/lib/ga-events";
import {
  recommendPlannerMedia,
  type RecommendReasonKey,
  type ScoredMedia,
} from "@/lib/planner/recommend";
import type {
  PlannerAgeKey,
  PlannerCampaignGoal,
  PlannerCategory,
  PlannerIndustryKey,
} from "@/lib/planner/types";
import type { PlannerGoalFollowUp } from "@/lib/planner/goal-follow-up";
import type { PlannerSeoulZoneKey } from "@/lib/planner/seoul-zones";
import type { PlannerBusanZoneKey } from "@/lib/planner/busan-zones";
import {
  selectBudgetNum,
  usePlannerStore,
} from "@/lib/planner/store";
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
import { resolveImpressionsForUnits } from "@/lib/media-quantity";
import {
  plannerMonthlyPriceWonForMedia,
  plannerUnitsForMedia,
  type CampaignMediaPriceOptionIndex,
  type CampaignMediaQuantities,
} from "@/lib/planner/planner-media-quantity";
import { mediaPlannerRegionDisplayLabel } from "@/lib/planner/planner-regions";
import { PlannerRecommendationAxisTabs } from "@/components/planner/recommendation-axis-tabs";
import { PlannerMediaThumb } from "@/components/planner/planner-media-thumb";
import type { RecommendationContext } from "@/lib/planner/recommendation-context";

const REASON_COLORS: Record<RecommendReasonKey, string> = {
  matchRegion: "border-border bg-card text-foreground",
  ageMatch: "border-primary bg-primary text-primary-foreground",
  budgetEfficient: "border-border bg-muted text-foreground",
  /** was bg-foreground + text-primary → 라이트에서 잉크 배경에 잉크 글자, 플래너 토큰에서도 대비 붕괴 */
  goalFit: "border-primary/55 bg-primary/12 text-primary",
  industryFit: "border-violet-500/55 bg-violet-500/12 text-violet-700 dark:text-violet-300",
  highVisibility: "border-primary bg-card text-primary",
  landmarkHotspot: "border-[#ff6200] bg-[#ff6200]/10 text-[#ff6200]",
  transitHotspot: "border-accent bg-accent/10 text-accent",
  retailHotspot: "border-emerald-500 bg-emerald-500/10 text-emerald-700",
  neighborhoodHotspot: "border-border bg-muted text-foreground",
};

export type PlannerRecommendationStoreBinding = {
  goal: PlannerCampaignGoal | null;
  regions: string[];
  categories: PlannerCategory[];
  ageKeys: PlannerAgeKey[];
  industryKey: PlannerIndustryKey;
  budgetMan: number;
  months: number;
  seoulZones?: PlannerSeoulZoneKey[];
  busanZones?: PlannerBusanZoneKey[];
  goalFollowUp?: PlannerGoalFollowUp;
  campaignMediaIds: string[];
  campaignMediaQuantities?: CampaignMediaQuantities;
  campaignMediaPriceOptionIndex?: CampaignMediaPriceOptionIndex;
  setCampaignMediaQuantity?: (mediaId: string, units: number) => void;
  setCampaignMediaPriceOptionIndex?: (mediaId: string, index: number) => void;
  setCampaignMediaIds: (updater: (prev: string[]) => string[]) => void;
};

type Props = {
  catalog: MediaItem[];
  isKo: boolean;
  regionLabel: (region: string) => string;
  /** 추천 개수 상한 (기본 5) */
  limit?: number;
  /** 통합 플래너 등 외부 store — 미전달 시 OOH `usePlannerStore` */
  store?: PlannerRecommendationStoreBinding;
  planCartAddedFrom?: "planner" | "search";
  /** API 추천 ID resolve 폴백 (캐시·외부 추가 매체) */
  supplementalById?: Record<string, MediaItem>;
};

function buildCatalogById(
  catalog: MediaItem[],
  supplementalById?: Record<string, MediaItem>,
): Map<string, MediaItem> {
  const byId = new Map(catalog.map((m) => [m.id, m]));
  if (supplementalById) {
    for (const [id, item] of Object.entries(supplementalById)) {
      if (!byId.has(id)) byId.set(id, item);
    }
  }
  return byId;
}

export function PlannerRecommendationPanel({
  catalog,
  isKo,
  regionLabel,
  limit = 5,
  store,
  planCartAddedFrom = "planner",
  supplementalById,
}: Props) {
  const t = useTranslations("planner");
  const locale = useLocale();
  const plannerGoal = usePlannerStore((s) => s.campaignGoal);
  const plannerRegions = usePlannerStore((s) => s.regions);
  const plannerCategories = usePlannerStore((s) => s.categories);
  const plannerAgeKeys = usePlannerStore((s) => s.ageKeys);
  const plannerIndustryKey = usePlannerStore((s) => s.industryKey);
  const plannerSeoulZones = usePlannerStore((s) => s.seoulZones);
  const plannerBusanZones = usePlannerStore((s) => s.busanZones);
  const plannerGoalFollowUp = usePlannerStore((s) => s.goalFollowUp);
  const plannerBudgetMan = usePlannerStore(selectBudgetNum);
  const plannerMonths = usePlannerStore((s) => s.months);
  const plannerSelectedIds = usePlannerStore((s) => s.campaignMediaIds);
  const plannerQuantities = usePlannerStore((s) => s.campaignMediaQuantities);
  const plannerPriceOptionIndex = usePlannerStore(
    (s) => s.campaignMediaPriceOptionIndex,
  );
  const plannerSetCampaignMediaIds = usePlannerStore((s) => s.setCampaignMediaIds);
  const plannerSetCampaignMediaQuantity = usePlannerStore(
    (s) => s.setCampaignMediaQuantity,
  );
  const plannerSetCampaignMediaPriceOptionIndex = usePlannerStore(
    (s) => s.setCampaignMediaPriceOptionIndex,
  );

  const goal = store?.goal ?? plannerGoal;
  const regions = store?.regions ?? plannerRegions;
  const categories = store?.categories ?? plannerCategories;
  const ageKeys = store?.ageKeys ?? plannerAgeKeys;
  const industryKey = store?.industryKey ?? plannerIndustryKey;
  const seoulZones = store?.seoulZones ?? plannerSeoulZones;
  const busanZones = store?.busanZones ?? plannerBusanZones;
  const goalFollowUp = store?.goalFollowUp ?? plannerGoalFollowUp;
  const budgetMan = store?.budgetMan ?? plannerBudgetMan;
  const months = store?.months ?? plannerMonths;
  const selectedIds = store?.campaignMediaIds ?? plannerSelectedIds;
  const campaignMediaQuantities =
    store?.campaignMediaQuantities ?? plannerQuantities;
  const campaignMediaPriceOptionIndex =
    store?.campaignMediaPriceOptionIndex ?? plannerPriceOptionIndex;
  const setCampaignMediaIds =
    store?.setCampaignMediaIds ?? plannerSetCampaignMediaIds;
  const setCampaignMediaQuantity =
    store?.setCampaignMediaQuantity ?? plannerSetCampaignMediaQuantity;
  const setCampaignMediaPriceOptionIndex =
    store?.setCampaignMediaPriceOptionIndex ??
    plannerSetCampaignMediaPriceOptionIndex;

  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);
  const [recommendations, setRecommendations] = useState<ScoredMedia[]>([]);
  const [matchScores, setMatchScores] = useState<Record<string, number>>({});
  const [oneLines, setOneLines] = useState<Record<string, string>>({});
  const [reasonings, setReasonings] = useState<Record<string, string>>({});
  const fetchRef = useRef(0);

  function reasonKeysFromBreakdown(
    breakdown: {
      budget: number;
      region: number;
      industry: number;
      target: number;
      category?: number;
      popularity: number;
    },
  ): RecommendReasonKey[] {
    const keys: RecommendReasonKey[] = [];
    if (breakdown.budget >= 20) keys.push("budgetEfficient");
    if (breakdown.region >= 15) keys.push("matchRegion");
    if (breakdown.industry >= 10) keys.push("industryFit");
    if (breakdown.target >= 12) keys.push("ageMatch");
    if ((breakdown.category ?? 0) >= 12) keys.push("goalFit");
    if (breakdown.popularity >= 5) keys.push("highVisibility");
    return keys.length > 0 ? keys : ["goalFit"];
  }

  const depsKey = useMemo(
    () =>
      `${goal ?? ""}|${regions.join(",")}|${seoulZones.join(",")}|${busanZones.join(",")}|${categories.join(",")}|${ageKeys.join(",")}|${industryKey}|${budgetMan}|${months}|${JSON.stringify(goalFollowUp)}|${refreshTick}`,
    [
      goal,
      regions,
      seoulZones,
      busanZones,
      categories,
      ageKeys,
      industryKey,
      budgetMan,
      months,
      goalFollowUp,
      refreshTick,
    ],
  );

  const catalogById = useMemo(
    () => buildCatalogById(catalog, supplementalById),
    [catalog, supplementalById],
  );

  useEffect(() => {
    const id = ++fetchRef.current;
    setLoading(true);
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch("/api/planner/recommend", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              goal,
              regions,
              seoulZones,
              busanZones,
              categories,
              ageKeys,
              industryKey,
              budgetMan,
              months,
              goalFollowUp,
              seed: refreshTick,
              limit,
              locale,
            }),
          });
          const data = (await res.json()) as {
            ok?: boolean;
            claudeUsed?: boolean;
            items?: Array<{
              mediaId: string;
              score: number;
              oneLine?: string;
              reasoning?: string;
              expectedImpact?: string;
              breakdown?: {
                budget: number;
                region: number;
                industry: number;
                target: number;
                popularity: number;
              };
            }>;
          };
          if (id !== fetchRef.current) return;
          if (data.ok && data.items?.length) {
            const scores: Record<string, number> = {};
            const lines: Record<string, string> = {};
            const narrative: Record<string, string> = {};
            const recs: ScoredMedia[] = [];
            const unresolvedIds: string[] = [];
            for (const item of data.items) {
              const media = catalogById.get(item.mediaId);
              if (!media) {
                unresolvedIds.push(item.mediaId);
                continue;
              }
              scores[media.id] = item.score;
              if (item.reasoning) narrative[media.id] = item.reasoning;
              const summary = item.expectedImpact ?? item.oneLine;
              if (summary && summary !== item.reasoning) {
                lines[media.id] = summary;
              }
              const reasonKeys =
                item.breakdown ?
                  reasonKeysFromBreakdown(item.breakdown)
                : item.score >= 70 ? (["goalFit"] as RecommendReasonKey[]) : [];
              recs.push({
                media,
                score: item.score / 100,
                reasons: reasonKeys.map((key) => ({ key, weight: 0.5 })),
              });
            }
            if (unresolvedIds.length > 0 && recs.length === 0) {
              const fallback = recommendPlannerMedia(
                catalog,
                {
                  goal,
                  regions,
                  seoulZones,
                  busanZones,
                  categories,
                  ageKeys,
                  industryKey,
                  budgetMan,
                  months,
                  goalFollowUp,
                },
                limit,
                refreshTick,
              );
              setRecommendations(fallback);
              setMatchScores(
                Object.fromEntries(
                  fallback.map((r) => [r.media.id, Math.round(r.score * 100)]),
                ),
              );
              setOneLines({});
              setReasonings({});
            } else {
              setRecommendations(recs);
              setMatchScores(scores);
              setOneLines(lines);
              setReasonings(narrative);
            }
          } else {
            const fallback = recommendPlannerMedia(
              catalog,
              {
                goal,
                regions,
                seoulZones,
                busanZones,
                categories,
                ageKeys,
                industryKey,
                budgetMan,
                months,
                goalFollowUp,
              },
              limit,
              refreshTick,
            );
            setRecommendations(fallback);
            setMatchScores(
              Object.fromEntries(
                fallback.map((r) => [r.media.id, Math.round(r.score * 100)]),
              ),
            );
            setOneLines({});
            setReasonings({});
          }
        } catch {
          if (id !== fetchRef.current) return;
          const fallback = recommendPlannerMedia(
            catalog,
            {
              goal,
              regions,
              seoulZones,
              busanZones,
              categories,
              ageKeys,
              industryKey,
              budgetMan,
              months,
              goalFollowUp,
            },
            limit,
            refreshTick,
          );
          setRecommendations(fallback);
        } finally {
          if (id === fetchRef.current) setLoading(false);
        }
      })();
    }, 500);
    return () => window.clearTimeout(timer);
  }, [
    depsKey,
    catalog,
    catalogById,
    goal,
    regions,
    categories,
    ageKeys,
    industryKey,
    budgetMan,
    months,
    limit,
    refreshTick,
    locale,
  ]);

  // 분석 애니메이션: depsKey 변경 시 위 effect에서 로딩 재생.

  const isSelected = (id: string) => selectedIds.includes(id);

  const handleToggle = (id: string) => {
    setCampaignMediaIds((prev) => {
      const adding = !prev.includes(id);
      if (adding) trackEvent("add_to_plan", { media_id: id, source: "recommend" });
      return adding ? [...prev, id] : prev.filter((x) => x !== id);
    });
  };

  const handleAddAll = () => {
    trackEvent("add_to_plan", { source: "recommend_all" });
    setCampaignMediaIds((prev) => {
      const merged = new Set(prev);
      for (const r of recommendations) merged.add(r.media.id);
      return [...merged];
    });
  };

  const recommendCtx = useMemo<RecommendationContext>(
    () => ({
      goal,
      regions,
      seoulZones,
      busanZones,
      categories,
      ageKeys,
      industryKey,
      budgetMan,
      months,
      goalFollowUp,
    }),
    [
      goal,
      regions,
      seoulZones,
      busanZones,
      categories,
      ageKeys,
      industryKey,
      budgetMan,
      months,
      goalFollowUp,
    ],
  );

  return (
    <PlannerNeonCard className="min-w-0 overflow-x-clip border-violet-400/20">
      <div className="flex min-w-0 flex-col gap-3 border-b dark:border-white/10 border-gray-100 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="min-w-0 space-y-1">
          <PlannerNeonLabel>{t("recommendEyebrow")}</PlannerNeonLabel>
          <h3
            className={cn(
              "flex items-center gap-2 text-lg",
              plannerNeon.headline,
            )}
          >
            <Sparkles className="h-5 w-5 text-violet-400" aria-hidden />
            {t("recommendHeading")}
          </h3>
          <p className={plannerNeon.subtext}>{t("recommendDesc")}</p>
        </div>
        <div className="grid w-full min-w-0 grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap">
          <button
            type="button"
            onClick={() => setRefreshTick((n) => n + 1)}
            disabled={loading}
            className={cn(
              plannerNeon.selectChip,
              plannerNeon.selectChipIdle,
              "w-full justify-center whitespace-nowrap px-4 py-2 disabled:opacity-50 sm:w-auto",
            )}
          >
            <RefreshCw
              className={cn("mr-1.5 inline h-3.5 w-3.5", loading && "animate-spin")}
              aria-hidden
            />
            {t("recommendRefresh")}
          </button>
          <button
            type="button"
            onClick={handleAddAll}
            disabled={loading || recommendations.length === 0}
            className={cn(plannerNeon.ctaSm, "w-full justify-center whitespace-nowrap disabled:opacity-50 sm:w-auto")}
          >
            {t("recommendAddAll")}
          </button>
        </div>
      </div>
      <div className="min-w-0 overflow-x-clip p-5 sm:p-6">
        {loading ? (
          <div
            className={cn(
              "flex items-center justify-center gap-3 py-10 text-sm",
              plannerNeon.subtext,
            )}
            role="status"
            aria-live="polite"
          >
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
            {t("recommendLoading")}
          </div>
        ) : recommendations.length === 0 ? (
          <p className={cn("py-10 text-center text-sm", plannerNeon.subtext)}>
            {t("recommendEmpty")}
          </p>
        ) : (
          <ul className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recommendations.map(({ media, reasons }) => {
              const selected = isSelected(media.id);
              const matchScore = matchScores[media.id];
              const oneLine = oneLines[media.id];
              const reasoning = reasonings[media.id];
              const displayName = isKo ? media.name : media.nameEn || media.name;
              const regionLine =
                mediaPlannerRegionDisplayLabel(
                  media,
                  locale,
                  t("regionNationalShort"),
                ) || regionLabel(media.region ?? "");
              const locationLine = (isKo
                ? media.location
                : media.locationEn || media.location
              ).slice(0, 28);

              const units = selected
                ? plannerUnitsForMedia(media, campaignMediaQuantities)
                : undefined;
              const monthlyImp =
                units != null
                  ? resolveImpressionsForUnits(media, units)
                  : estimatedMonthlyImpressions(media);
              const visPct = Math.round(
                normalizeVisibilityScore(media.visibilityScore) * 100,
              );
              const priceWon = selected
                ? plannerMonthlyPriceWonForMedia(
                    media,
                    campaignMediaQuantities,
                    campaignMediaPriceOptionIndex,
                  )
                : null;
              const cpm =
                priceWon != null && priceWon > 0 && monthlyImp > 0
                  ? Math.round(priceWon / (monthlyImp / 1000))
                  : estimatedCpmWon(media);
              const metricItems: string[] = [];
              if (monthlyImp > 0) {
                metricItems.push(
                  isKo
                    ? `월 ${Math.round(monthlyImp / 1000).toLocaleString()}K 노출`
                    : `${Math.round(monthlyImp / 1000).toLocaleString()}K imp/mo`,
                );
              }
              if (visPct > 0) {
                metricItems.push(
                  isKo ? `가시성 ${visPct}/100` : `Vis ${visPct}/100`,
                );
              }
              if (cpm != null && cpm > 0) {
                metricItems.push(
                  `CPM ${formatCpmKrw(Math.round(cpm), isKo ? "ko" : "en")}`,
                );
              }

              return (
                <li
                  key={media.id}
                  className={cn(
                    "flex min-w-0 gap-2.5 rounded-xl border p-2.5 transition-colors sm:gap-3",
                    selected
                      ? "border-violet-400/50 dark:bg-violet-500/10 bg-violet-50"
                      : "dark:border-white/10 border-gray-200 dark:bg-white/5 bg-white hover:border-violet-300/40",
                  )}
                >
                  <PlannerMediaThumb media={media} alt={displayName} size="card" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                        {displayName}
                      </p>
                      {typeof matchScore === "number" ? (
                        <p className="mt-0.5 text-[11px] font-semibold text-violet-600 dark:text-violet-300">
                          {isKo
                            ? `매칭도 ${matchScore}점`
                            : `Match ${matchScore}/100`}
                        </p>
                      ) : null}
                      <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">
                        {regionLine}
                        {locationLine ? ` · ${locationLine}` : ""}
                      </p>
                    </div>
                    {reasoning ? (
                      <p className="line-clamp-2 text-[11px] leading-relaxed text-foreground/90">
                        {reasoning}
                      </p>
                    ) : oneLine ? (
                      <p className="line-clamp-1 text-[11px] text-muted-foreground">
                        {oneLine}
                      </p>
                    ) : null}
                    {metricItems.length > 0 ? (
                      <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
                        {metricItems.map((it) => (
                          <span key={it} className="whitespace-nowrap">
                            {it}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {reasons.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {reasons.slice(0, 2).map((r) => (
                          <span
                            key={r.key}
                            className={cn(
                              "max-w-full truncate border px-1.5 py-0.5 text-[10px] font-medium",
                              REASON_COLORS[r.key],
                            )}
                          >
                            {t(`recommendReason.${r.key}`)}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-auto flex items-center gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() => handleToggle(media.id)}
                        title={t("recommendAddCampaignHint")}
                        className={cn(
                          "inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-lg px-3 text-xs font-semibold",
                          selected
                            ? cn(plannerNeon.selectChip, plannerNeon.selectChipActive)
                            : plannerNeon.ctaSm,
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
                      {selected ? (
                        <span className="text-[10px] text-muted-foreground">
                          {t("recommendTabQtyHint")}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {!loading && catalog.length > 0 ? (
          <PlannerRecommendationAxisTabs
            catalog={catalog}
            ctx={recommendCtx}
            isKo={isKo}
            seed={refreshTick}
            selectedIds={selectedIds}
            setCampaignMediaIds={setCampaignMediaIds}
          />
        ) : null}
      </div>
    </PlannerNeonCard>
  );
}

"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Sparkles, RefreshCw } from "lucide-react";
import type { MediaItem } from "@/lib/media-data";
import { trackEvent } from "@/lib/ga-events";
import {
  recommendPlannerMedia,
  type RecommendReasonKey,
  type ScoredMedia,
} from "@/lib/planner/recommend";
import { rationaleKeysFromBreakdown } from "@/lib/recommend/recommend-rationale";
import type { LocalizedRationaleLine } from "@/lib/recommend/recommend-rationale";
import type { ScoredMedia as AiScoredMedia } from "@/lib/ai-media-recommend";
import type {
  PlannerAgeKey,
  PlannerCampaignGoal,
  PlannerCategory,
  PlannerIndustryKey,
} from "@/lib/planner/types";
import type { PlannerGoalFollowUp } from "@/lib/planner/goal-follow-up";
import type { PlannerSeoulZoneKey } from "@/lib/planner/seoul-zones";
import type { PlannerBusanZoneKey } from "@/lib/planner/busan-zones";
import type { PlannerGyeonggiZoneKey } from "@/lib/planner/gyeonggi-zones";
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
import { resolveMediaQuantity } from "@/lib/media-quantity";
import {
  shouldShowPlannerQuantityControl,
  type CampaignMediaPriceOptionIndex,
  type CampaignMediaQuantities,
} from "@/lib/planner/planner-media-quantity";
import { PlannerRecommendationAxisTabs } from "@/components/planner/recommendation-axis-tabs";
import { PlannerMediaQuantityControl } from "@/components/planner/planner-media-quantity-control";
import {
  RECOMMEND_MEDIA_GRID_CLASS,
  RecommendScoredMediaCard,
} from "@/components/media-ai-recommend-scored-card";
import type { RecommendationContext } from "@/lib/planner/recommendation-context";

function plannerScoredToAiScored(
  rec: ScoredMedia,
  matchScores: Record<string, number>,
  rationaleByMediaId: Record<string, LocalizedRationaleLine[]>,
): AiScoredMedia {
  const id = rec.media.id;
  return {
    item: rec.media,
    score: matchScores[id] ?? Math.round(rec.score * 100),
    reasons: [],
    rationaleLines: rationaleByMediaId[id] ?? rec.rationaleLines ?? [],
  };
}

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
  gyeonggiZones?: PlannerGyeonggiZoneKey[];
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
  /** 추천 개수 상한 (기본 8) */
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
  limit = 8,
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
  const plannerGyeonggiZones = usePlannerStore((s) => s.gyeonggiZones);
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
  const gyeonggiZones = store?.gyeonggiZones ?? plannerGyeonggiZones;
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
  const [rationaleByMediaId, setRationaleByMediaId] = useState<
    Record<string, LocalizedRationaleLine[]>
  >({});
  const [axisDraftQuantities, setAxisDraftQuantities] =
    useState<CampaignMediaQuantities>({});
  const [axisDraftPriceOptionIndex, setAxisDraftPriceOptionIndex] =
    useState<CampaignMediaPriceOptionIndex>({});
  const fetchRef = useRef(0);

  const depsKey = useMemo(
    () =>
      `${goal ?? ""}|${regions.join(",")}|${seoulZones.join(",")}|${busanZones.join(",")}|${gyeonggiZones.join(",")}|${categories.join(",")}|${ageKeys.join(",")}|${industryKey}|${budgetMan}|${months}|${JSON.stringify(goalFollowUp)}|${refreshTick}`,
    [
      goal,
      regions,
      seoulZones,
      busanZones,
      gyeonggiZones,
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
              gyeonggiZones,
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
              rationaleLines?: LocalizedRationaleLine[];
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
            const rationaleMap: Record<string, LocalizedRationaleLine[]> = {};
            const recs: ScoredMedia[] = [];
            const unresolvedIds: string[] = [];
            for (const item of data.items) {
              const media = catalogById.get(item.mediaId);
              if (!media) {
                unresolvedIds.push(item.mediaId);
                continue;
              }
              scores[media.id] = item.score;
              if (item.rationaleLines?.length) {
                rationaleMap[media.id] = item.rationaleLines;
              }
              const reasonKeys =
                item.breakdown ?
                  reasonKeysFromBreakdown(item.breakdown)
                : item.score >= 70 ? (["goalFit"] as RecommendReasonKey[]) : [];
              recs.push({
                media,
                score: item.score / 100,
                reasons: reasonKeys.map((key) => ({ key, weight: 0.5 })),
                rationaleLines: item.rationaleLines ?? [],
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
              setRationaleByMediaId(
                Object.fromEntries(
                  fallback.map((r) => [r.media.id, r.rationaleLines ?? []]),
                ),
              );
            } else {
              setRecommendations(recs);
              setMatchScores(scores);
              setRationaleByMediaId(rationaleMap);
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
            setRationaleByMediaId(
              Object.fromEntries(
                fallback.map((r) => [r.media.id, r.rationaleLines ?? []]),
              ),
            );
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
              gyeonggiZones,
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
          setRationaleByMediaId(
            Object.fromEntries(
              fallback.map((r) => [r.media.id, r.rationaleLines ?? []]),
            ),
          );
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

  const handleAddAll = () => {
    trackEvent("add_to_plan", { source: "recommend_all" });
    setCampaignMediaIds((prev) => {
      const merged = new Set(prev);
      for (const r of recommendations) merged.add(r.media.id);
      return [...merged];
    });
  };

  const effectiveAxisQuantities = useMemo(
    () => ({ ...axisDraftQuantities, ...campaignMediaQuantities }),
    [axisDraftQuantities, campaignMediaQuantities],
  );

  const effectiveAxisPriceOptionIndex = useMemo(
    () => ({
      ...axisDraftPriceOptionIndex,
      ...campaignMediaPriceOptionIndex,
    }),
    [axisDraftPriceOptionIndex, campaignMediaPriceOptionIndex],
  );

  const renderPlannerAxisQuantityControl = useCallback(
    (media: MediaItem) => {
      if (!shouldShowPlannerQuantityControl(media)) return null;
      return (
        <PlannerMediaQuantityControl
          media={media}
          isKo={isKo}
          quantities={effectiveAxisQuantities}
          priceOptionIndex={effectiveAxisPriceOptionIndex}
          onQuantityChange={(units) => {
            if (selectedIds.includes(media.id)) {
              setCampaignMediaQuantity(media.id, units);
              return;
            }
            setAxisDraftQuantities((prev) => ({ ...prev, [media.id]: units }));
          }}
          onPriceOptionChange={(index) => {
            if (selectedIds.includes(media.id)) {
              setCampaignMediaPriceOptionIndex(media.id, index);
              return;
            }
            setAxisDraftPriceOptionIndex((prev) => ({
              ...prev,
              [media.id]: index,
            }));
          }}
          compact
        />
      );
    },
    [
      isKo,
      effectiveAxisQuantities,
      effectiveAxisPriceOptionIndex,
      selectedIds,
      setCampaignMediaQuantity,
      setCampaignMediaPriceOptionIndex,
    ],
  );

  const handleAxisCampaignToggle = useCallback(
    (media: MediaItem, axisSource: string) => {
      setCampaignMediaIds((prev) => {
        const adding = !prev.includes(media.id);
        if (adding) {
          trackEvent("add_to_plan", {
            media_id: media.id,
            source: axisSource,
          });
          const units =
            effectiveAxisQuantities[media.id] ??
            resolveMediaQuantity(media, campaignMediaQuantities[media.id]);
          const priceIdx = effectiveAxisPriceOptionIndex[media.id];
          queueMicrotask(() => {
            setCampaignMediaQuantity(media.id, units);
            if (priceIdx != null) {
              setCampaignMediaPriceOptionIndex(media.id, priceIdx);
            }
          });
        }
        return adding
          ? [...prev, media.id]
          : prev.filter((x) => x !== media.id);
      });
    },
    [
      setCampaignMediaIds,
      effectiveAxisQuantities,
      effectiveAxisPriceOptionIndex,
      campaignMediaQuantities,
      setCampaignMediaQuantity,
      setCampaignMediaPriceOptionIndex,
    ],
  );

  const recommendCtx = useMemo<RecommendationContext>(
    () => ({
      goal,
      regions,
      seoulZones,
      busanZones,
      gyeonggiZones,
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
      gyeonggiZones,
      categories,
      ageKeys,
      industryKey,
      budgetMan,
      months,
      goalFollowUp,
    ],
  );

  return (
    <PlannerNeonCard className="min-w-0 overflow-x-auto border-violet-400/20">
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
      <div className="min-w-0 overflow-x-auto p-5 sm:p-6">
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
          <ul className={RECOMMEND_MEDIA_GRID_CLASS}>
            {recommendations.map((rec, index) => (
              <RecommendScoredMediaCard
                key={rec.media.id}
                scored={plannerScoredToAiScored(
                  rec,
                  matchScores,
                  rationaleByMediaId,
                )}
                rank={index + 1}
                isKo={isKo}
                locale={locale}
                plannerMode
                isInPlan={isSelected(rec.media.id)}
                planAddedFrom={planCartAddedFrom}
                quantityControl={renderPlannerAxisQuantityControl(rec.media)}
                onTogglePlan={() =>
                  handleAxisCampaignToggle(rec.media, "recommend")
                }
              />
            ))}
          </ul>
        )}
        {!loading && catalog.length > 0 ? (
          <PlannerRecommendationAxisTabs
            catalog={catalog}
            ctx={recommendCtx}
            isKo={isKo}
            locale={locale}
            seed={refreshTick}
            selectedIds={selectedIds}
            setCampaignMediaIds={setCampaignMediaIds}
            renderQuantityControl={renderPlannerAxisQuantityControl}
            onCampaignToggleMedia={handleAxisCampaignToggle}
          />
        ) : null}
      </div>
    </PlannerNeonCard>
  );
}

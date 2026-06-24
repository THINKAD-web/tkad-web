"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Sparkles, Plus, Check, RefreshCw, Eye, Users } from "lucide-react";
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
import { formatMediaCategoryBadges } from "@/lib/media-category-badges";
import { mediaPlannerRegionDisplayLabel } from "@/lib/planner/planner-regions";
import { PlanCartAddButton } from "@/components/plan/plan-cart-add-button";
import { PlanCartBulkAddButton } from "@/components/plan/plan-cart-bulk-add-button";
import { planCartItemFromMediaItem } from "@/lib/plan-cart-item-builders";

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
  goalFollowUp?: PlannerGoalFollowUp;
  campaignMediaIds: string[];
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
  const plannerGoalFollowUp = usePlannerStore((s) => s.goalFollowUp);
  const plannerBudgetMan = usePlannerStore(selectBudgetNum);
  const plannerMonths = usePlannerStore((s) => s.months);
  const plannerSelectedIds = usePlannerStore((s) => s.campaignMediaIds);
  const plannerSetCampaignMediaIds = usePlannerStore((s) => s.setCampaignMediaIds);

  const goal = store?.goal ?? plannerGoal;
  const regions = store?.regions ?? plannerRegions;
  const categories = store?.categories ?? plannerCategories;
  const ageKeys = store?.ageKeys ?? plannerAgeKeys;
  const industryKey = store?.industryKey ?? plannerIndustryKey;
  const seoulZones = store?.seoulZones ?? plannerSeoulZones;
  const goalFollowUp = store?.goalFollowUp ?? plannerGoalFollowUp;
  const budgetMan = store?.budgetMan ?? plannerBudgetMan;
  const months = store?.months ?? plannerMonths;
  const selectedIds = store?.campaignMediaIds ?? plannerSelectedIds;
  const setCampaignMediaIds =
    store?.setCampaignMediaIds ?? plannerSetCampaignMediaIds;

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
      `${goal ?? ""}|${regions.join(",")}|${seoulZones.join(",")}|${categories.join(",")}|${ageKeys.join(",")}|${industryKey}|${budgetMan}|${months}|${JSON.stringify(goalFollowUp)}|${refreshTick}`,
    [
      goal,
      regions,
      seoulZones,
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

  const planBulkItems = useMemo(
    () =>
      recommendations.map(({ media }) =>
        planCartItemFromMediaItem(media, planCartAddedFrom),
      ),
    [recommendations, planCartAddedFrom],
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
          <PlanCartBulkAddButton
            items={planBulkItems}
            label={isKo ? "추천 전체 플랜에 추가" : "Add all to plan"}
            className="!h-auto w-full justify-center !px-4 !py-2 !text-xs sm:w-auto"
          />
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
              return (
                <li
                  key={media.id}
                  className={cn(
                    "flex min-w-0 flex-col gap-2 rounded-xl border p-4 transition-colors",
                    selected
                      ? "border-violet-400/50 dark:bg-violet-500/10 bg-violet-50"
                      : "dark:border-white/10 border-gray-200 dark:bg-white/5 bg-white hover:border-violet-300/40",
                  )}
                >
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm font-semibold leading-snug tracking-normal text-foreground">
                      {isKo ? media.name : media.nameEn || media.name}
                    </p>
                    {typeof matchScore === "number" ? (
                      <p className="mt-1 text-xs font-semibold text-violet-600 dark:text-violet-300">
                        {isKo ?
                          `매칭도 ${matchScore}점`
                        : `Match ${matchScore}/100`}
                      </p>
                    ) : null}
                    {reasoning ? (
                      <p className="mt-2 text-xs leading-relaxed text-foreground/90">
                        {reasoning}
                      </p>
                    ) : null}
                    {oneLine ? (
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {oneLine}
                      </p>
                    ) : null}
                    <p className="mt-1 break-words font-display text-[11px] font-medium uppercase tracking-tight text-muted-foreground">
                      {`// `}
                      {mediaPlannerRegionDisplayLabel(
                        media,
                        locale,
                        t("regionNationalShort"),
                      ) || regionLabel(media.region ?? "")}
                      {" · "}
                      {(isKo
                        ? media.location
                        : media.locationEn || media.location
                      ).slice(0, 28)}
                    </p>
                  </div>
                  {/* [PATCH-P3-01] AI 추천의 수치 근거 — 노출/가시성/CPM 한 줄 */}
                  {(() => {
                    const monthlyImp = estimatedMonthlyImpressions(media);
                    const visPct = Math.round(
                      normalizeVisibilityScore(media.visibilityScore) * 100,
                    );
                    const cpm = estimatedCpmWon(media);
                    const items: string[] = [];
                    if (monthlyImp > 0) {
                      items.push(
                        isKo
                          ? `월 ${Math.round(monthlyImp / 1000).toLocaleString()}K 노출`
                          : `${Math.round(monthlyImp / 1000).toLocaleString()}K imp/mo`,
                      );
                    }
                    if (visPct > 0) {
                      items.push(
                        isKo ? `가시성 ${visPct}/100` : `Vis ${visPct}/100`,
                      );
                    }
                    if (cpm != null && cpm > 0) {
                      items.push(
                        `CPM ${formatCpmKrw(Math.round(cpm), isKo ? "ko" : "en")}`,
                      );
                    }
                    if (items.length === 0) return null;
                    // 모바일: 세로 스택 / sm+: 한 줄 wrap. (uppercase·letter-spacing 제거로 폭 초과 방지)
                    return (
                      <div className="flex w-full min-w-0 flex-col gap-0.5 text-[11px] font-medium tabular-nums text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3">
                        {items.map((it, i) => (
                          <span
                            key={it}
                            className="inline-flex min-w-0 items-center gap-1 break-words"
                          >
                            {i === 0 ? (
                              <Users className="h-3 w-3 shrink-0 text-primary" aria-hidden />
                            ) : i === 1 ? (
                              <Eye className="h-3 w-3 shrink-0 text-primary" aria-hidden />
                            ) : null}
                            {it}
                          </span>
                        ))}
                      </div>
                    );
                  })()}
                  {reasons.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {reasons.map((r) => (
                        <span
                          key={r.key}
                          className={cn(
                            "max-w-full break-words border-2 px-2 py-0.5 font-display text-[11px] font-medium normal-case tracking-normal sm:text-xs sm:uppercase sm:tracking-[0.12em]",
                            REASON_COLORS[r.key],
                          )}
                        >
                          {t(`recommendReason.${r.key}`)}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {(() => {
                    const badges = formatMediaCategoryBadges(media, locale, 2);
                    if (badges.length === 0) return null;
                    return (
                      <div className="flex flex-wrap gap-1">
                        {badges.map((b) => (
                          <span
                            key={`${media.id}-${b.label}`}
                            className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:text-violet-200"
                          >
                            {b.icon} {b.label}
                          </span>
                        ))}
                      </div>
                    );
                  })()}
                  <button
                    type="button"
                    onClick={() => handleToggle(media.id)}
                    className={cn(
                      "mt-auto w-full",
                      selected
                        ? cn(plannerNeon.selectChip, plannerNeon.selectChipActive, "py-2")
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
                  <PlanCartAddButton
                    item={planCartItemFromMediaItem(media, planCartAddedFrom)}
                    addedFrom="planner"
                    compact
                    className="w-full"
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </PlannerNeonCard>
  );
}

"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Sparkles, Plus, Check, RefreshCw, Eye, Users } from "lucide-react";
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
  const locale = useLocale();
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
  const [recommendations, setRecommendations] = useState<ScoredMedia[]>([]);
  const [matchScores, setMatchScores] = useState<Record<string, number>>({});
  const [oneLines, setOneLines] = useState<Record<string, string>>({});
  const fetchRef = useRef(0);

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
              categories,
              ageKey,
              industryKey,
              budgetMan,
              months,
              seed: refreshTick,
              limit,
              locale,
            }),
          });
          const data = (await res.json()) as {
            ok?: boolean;
            items?: Array<{
              mediaId: string;
              score: number;
              oneLine?: string;
            }>;
          };
          if (id !== fetchRef.current) return;
          if (data.ok && data.items?.length) {
            const byId = new Map(catalog.map((m) => [m.id, m]));
            const scores: Record<string, number> = {};
            const lines: Record<string, string> = {};
            const recs: ScoredMedia[] = [];
            for (const item of data.items) {
              const media = byId.get(item.mediaId);
              if (!media) continue;
              scores[media.id] = item.score;
              if (item.oneLine) lines[media.id] = item.oneLine;
              recs.push({
                media,
                score: item.score / 100,
                reasons: [
                  ...(item.score >= 70 ?
                    [{ key: "goalFit" as RecommendReasonKey, weight: 0.7 }]
                  : []),
                ],
              });
            }
            setRecommendations(recs);
            setMatchScores(scores);
            setOneLines(lines);
          } else {
            const fallback = recommendPlannerMedia(
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
            );
            setRecommendations(fallback);
            setMatchScores(
              Object.fromEntries(
                fallback.map((r) => [r.media.id, Math.round(r.score * 100)]),
              ),
            );
            setOneLines({});
          }
        } catch {
          if (id !== fetchRef.current) return;
          const fallback = recommendPlannerMedia(
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
    goal,
    regions,
    categories,
    ageKey,
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
    <PlannerNeonCard className="border-violet-400/20">
      <div className="flex flex-col gap-3 border-b dark:border-white/10 border-gray-100 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="space-y-1">
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
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setRefreshTick((n) => n + 1)}
            disabled={loading}
            className={cn(
              plannerNeon.selectChip,
              plannerNeon.selectChipIdle,
              "px-4 py-2 disabled:opacity-50",
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
            className={cn(plannerNeon.ctaSm, "disabled:opacity-50")}
          >
            {t("recommendAddAll")}
          </button>
        </div>
      </div>
      <div className="p-5 sm:p-6">
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
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recommendations.map(({ media, reasons }) => {
              const selected = isSelected(media.id);
              const matchScore = matchScores[media.id];
              const oneLine = oneLines[media.id];
              return (
                <li
                  key={media.id}
                  className={cn(
                    "flex flex-col gap-2 rounded-xl border p-4 transition-colors",
                    selected
                      ? "border-violet-400/50 dark:bg-violet-500/10 bg-violet-50"
                      : "dark:border-white/10 border-gray-200 dark:bg-white/5 bg-white hover:border-violet-300/40",
                  )}
                >
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm font-bold leading-snug tracking-tight text-foreground">
                      {isKo ? media.name : media.nameEn || media.name}
                    </p>
                    {typeof matchScore === "number" ? (
                      <p className="mt-1 text-xs font-semibold text-violet-600 dark:text-violet-300">
                        {isKo ?
                          `매칭도 ${matchScore}점`
                        : `Match ${matchScore}/100`}
                      </p>
                    ) : null}
                    {oneLine ? (
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {oneLine}
                      </p>
                    ) : null}
                    <p className="mt-1 font-display text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      {`// `}{regionLabel(media.region)} ·{" "}
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
                    return (
                      <p className="inline-flex flex-wrap items-center gap-x-3 gap-y-0.5 font-display text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        <Users className="h-3 w-3 text-primary" aria-hidden />
                        <span>{items[0]}</span>
                        {items[1] ? (
                          <>
                            <Eye className="h-3 w-3 text-primary" aria-hidden />
                            <span>{items[1]}</span>
                          </>
                        ) : null}
                        {items[2] ? <span>· {items[2]}</span> : null}
                      </p>
                    );
                  })()}
                  {reasons.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {reasons.map((r) => (
                        <span
                          key={r.key}
                          className={cn(
                            "border-2 px-2 py-0.5 font-display text-xs font-medium uppercase tracking-[0.18em]",
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
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </PlannerNeonCard>
  );
}

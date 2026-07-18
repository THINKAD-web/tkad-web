import type { MediaItem } from "@/lib/media-data";
import {
  estimateCatalogCpmWon,
  resolveMonthlyImpressions,
} from "@/lib/media-metrics";
import {
  filterCatalogByRegionCodes,
  pickRecommendPool,
  type AiRecommendInput,
} from "@/lib/ai-media-recommend";
import {
  scoreMediaForRanking,
  type MatchedMedia,
  type ScoreBreakdown,
} from "@/lib/matching-engine";
import { formatCpmKrw } from "@/lib/media-price-format";
import { matchesPlannerCategory } from "@/lib/planner-logic";
import { filterCatalogByPlannerRegions } from "@/lib/planner/planner-regions";
import type { RecommendationContext } from "@/lib/planner/recommendation-context";
import type { PlannerCategory } from "@/lib/planner/types";
import {
  aiInputToMatching,
  plannerContextToMatching,
} from "@/lib/recommendation-adapters";

export type RecommendTabAxis =
  | "budgetEfficiency"
  | "targetMatch"
  | "goalFit"
  | "industryFit";

export const RECOMMEND_TAB_AXES: readonly RecommendTabAxis[] = [
  "budgetEfficiency",
  "targetMatch",
  "goalFit",
  "industryFit",
] as const;

export const AXIS_SCORE_MAX: Record<
  Exclude<RecommendTabAxis, "budgetEfficiency">,
  number
> = {
  targetMatch: 15,
  goalFit: 15,
  industryFit: 20,
};

export type AxisRankedItem = {
  rank: number;
  media: MediaItem;
  breakdown: ScoreBreakdown;
  /** 축 점수(높을수록 좋음) — 예산효율 탭은 CPM 역수 정규화 0–100 */
  axisScore: number;
  metricKo: string;
  metricEn: string;
};

export function isIndustryTabAvailable(ctx: RecommendationContext): boolean {
  return !!ctx.industryKey && ctx.industryKey !== "indOther";
}

export function isRecommendIndustryTabAvailable(
  input: AiRecommendInput,
): boolean {
  return !!input.industry && input.industry !== "other";
}

export function visiblePlannerAxes(
  ctx: RecommendationContext,
): RecommendTabAxis[] {
  return RECOMMEND_TAB_AXES.filter(
    (axis) => axis !== "industryFit" || isIndustryTabAvailable(ctx),
  );
}

export function visibleRecommendAxes(
  input: AiRecommendInput,
): RecommendTabAxis[] {
  return RECOMMEND_TAB_AXES.filter(
    (axis) => axis !== "industryFit" || isRecommendIndustryTabAvailable(input),
  );
}

/** 업종 탭 — 키워드·유형 신호가 있는 매체가 충분한지 */
export function hasIndustryRankingSignal(
  ranked: readonly AxisRankedItem[],
): boolean {
  return ranked.some((r) => r.breakdown.industry >= 10);
}

function filterRecommendPool(
  catalog: readonly MediaItem[],
  ctx: RecommendationContext,
): MediaItem[] {
  let pool = catalog.filter((m) => {
    if (ctx.categories.length === 0) return true;
    return (ctx.categories as readonly PlannerCategory[]).some((c) =>
      matchesPlannerCategory(m, c),
    );
  });
  if (ctx.regions.length > 0) {
    pool = filterCatalogByPlannerRegions(pool, ctx.regions);
  }
  return pool;
}

function scoreRecommendPool(
  pool: readonly MediaItem[],
  ctx: RecommendationContext,
  seed: number,
): MatchedMedia[] {
  const matchingInput = plannerContextToMatching(ctx, seed);
  return pool.map((m) => scoreMediaForRanking(m, matchingInput));
}

function breakdownAxisValue(
  scored: MatchedMedia,
  axis: RecommendTabAxis,
): number {
  switch (axis) {
    case "budgetEfficiency":
      return scored.breakdown.budget;
    case "targetMatch":
      return scored.breakdown.target;
    case "goalFit":
      return scored.breakdown.category;
    case "industryFit":
      return scored.breakdown.industry;
  }
}

function cpmEfficiencyScore(cpm: number): number {
  if (!Number.isFinite(cpm) || cpm <= 0) return 0;
  // CPM ₩50,000 이상 → 0, ₩5,000 이하 → 100 (선형)
  const clamped = Math.max(5_000, Math.min(50_000, cpm));
  return Math.round(((50_000 - clamped) / 45_000) * 100);
}

function metricLabelsForAxis(
  scored: MatchedMedia,
  axis: RecommendTabAxis,
): { metricKo: string; metricEn: string; axisScore: number } {
  if (axis === "budgetEfficiency") {
    const cpm = estimateCatalogCpmWon(scored.media);
    const imp = resolveMonthlyImpressions(scored.media);
    if (cpm != null && cpm > 0) {
      const cpmRounded = Math.round(cpm);
      return {
        axisScore: cpmEfficiencyScore(cpm),
        metricKo: `CPM ${formatCpmKrw(cpmRounded, "ko")} · 월 ${Math.round(imp / 1000).toLocaleString()}K 노출`,
        metricEn: `CPM ${formatCpmKrw(cpmRounded, "en")} · ${Math.round(imp / 1000).toLocaleString()}K imp/mo`,
      };
    }
    return {
      axisScore: 0,
      metricKo: "CPM 산출 불가",
      metricEn: "CPM unavailable",
    };
  }

  const pts = breakdownAxisValue(scored, axis);
  const max =
    axis === "industryFit" ? AXIS_SCORE_MAX.industryFit
    : axis === "targetMatch" ? AXIS_SCORE_MAX.targetMatch
    : AXIS_SCORE_MAX.goalFit;
  const pct = max > 0 ? Math.round((pts / max) * 100) : 0;
  return {
    axisScore: pct,
    metricKo: `${pts}/${max}점 (${pct}%)`,
    metricEn: `${pts}/${max} pts (${pct}%)`,
  };
}

function sortByAxis(
  scored: MatchedMedia[],
  axis: RecommendTabAxis,
): MatchedMedia[] {
  const copy = [...scored];
  if (axis === "budgetEfficiency") {
    return copy
      .filter((s) => {
        const cpm = estimateCatalogCpmWon(s.media);
        return cpm != null && cpm > 0;
      })
      .sort((a, b) => {
        const cpmA = estimateCatalogCpmWon(a.media) ?? Infinity;
        const cpmB = estimateCatalogCpmWon(b.media) ?? Infinity;
        if (cpmA !== cpmB) return cpmA - cpmB;
        return (
          resolveMonthlyImpressions(b.media) -
          resolveMonthlyImpressions(a.media)
        );
      });
  }

  return copy.sort((a, b) => {
    const d = breakdownAxisValue(b, axis) - breakdownAxisValue(a, axis);
    if (d !== 0) return d;
    return b.score - a.score;
  });
}

/**
 * 축별 top-N — knapsack·다양성 선택과 무관한 단순 정렬.
 * `scoreMediaForRanking` breakdown 재사용.
 */
function toAxisRankedItems(
  sorted: MatchedMedia[],
  axis: RecommendTabAxis,
  limit: number,
): AxisRankedItem[] {
  return sorted.slice(0, limit).map((s, i) => {
    const { axisScore, metricKo, metricEn } = metricLabelsForAxis(s, axis);
    return {
      rank: i + 1,
      media: s.media,
      breakdown: s.breakdown,
      axisScore,
      metricKo,
      metricEn,
    };
  });
}

export function rankPlannerMediaByAxis(
  catalog: readonly MediaItem[],
  ctx: RecommendationContext,
  axis: RecommendTabAxis,
  limit = 10,
  seed = 0,
): AxisRankedItem[] {
  const pool = filterRecommendPool(catalog, ctx);
  if (pool.length === 0) return [];

  const scored = scoreRecommendPool(pool, ctx, seed);
  const sorted = sortByAxis(scored, axis);
  return toAxisRankedItems(sorted, axis, limit);
}

/**
 * AI 추천 결과 축별 Top-N — `pickRecommendPool` + `aiInputToMatching` (엔진 동일).
 */
export function rankRecommendMediaByAxis(
  catalog: readonly MediaItem[],
  input: AiRecommendInput,
  regionCodes: readonly string[],
  axis: RecommendTabAxis,
  limit = 10,
  seed = 0,
): AxisRankedItem[] {
  const regionFiltered = filterCatalogByRegionCodes(catalog, regionCodes);
  const base = regionFiltered.length > 0 ? regionFiltered : [...catalog];
  const pool = pickRecommendPool(base, input);
  if (pool.length === 0) return [];

  const matchingInput = aiInputToMatching(input, seed);
  const scored = pool.map((m) => scoreMediaForRanking(m, matchingInput));
  const sorted = sortByAxis(scored, axis);
  return toAxisRankedItems(sorted, axis, limit);
}

/** 659매체 풀 스코어링 벤치 — 개발·회귀 확인용 */
export function benchmarkAxisRankingMs(
  catalog: readonly MediaItem[],
  ctx: RecommendationContext,
  seed = 0,
): number {
  const t0 = performance.now();
  const pool = filterRecommendPool(catalog, ctx);
  const scored = scoreRecommendPool(pool, ctx, seed);
  for (const axis of RECOMMEND_TAB_AXES) {
    sortByAxis(scored, axis);
  }
  return performance.now() - t0;
}

import type { MediaItem } from "@/lib/media-data";
import { matchesPlannerCategory } from "@/lib/planner-logic";
import type { PlannerCategory } from "@/lib/planner/types";
import { matchMediaCatalog } from "@/lib/matching-engine";
import {
  plannerContextToMatching,
  displayContextFromPlannerContext,
} from "@/lib/recommendation-adapters";
import { filterCatalogByPlannerRegions } from "@/lib/planner/planner-regions";
import { mediaMatchesBusanZones } from "@/lib/planner/busan-zones";
import { mediaMatchesGyeonggiZones } from "@/lib/planner/gyeonggi-zones";
import { mediaMatchesIncheonZones } from "@/lib/planner/incheon-zones";
import {
  formatRecommendRationale,
  rationaleKeysFromBreakdown,
  type LocalizedRationaleLine,
} from "@/lib/recommend/recommend-rationale";

import type { RecommendationContext } from "@/lib/planner/recommendation-context";

export type { RecommendationContext } from "@/lib/planner/recommendation-context";

export type RecommendReasonKey =
  | "matchRegion"
  | "highVisibility"
  | "budgetEfficient"
  | "ageMatch"
  | "goalFit"
  | "industryFit"
  | "landmarkHotspot"
  | "transitHotspot"
  | "retailHotspot"
  | "neighborhoodHotspot";

export type RecommendReason = { key: RecommendReasonKey; weight: number };

export type ScoredMedia = {
  media: MediaItem;
  score: number;
  /** 점수 기여도 상위 2–3개. UI 칩용. */
  reasons: RecommendReason[];
  /** 조건 연결 문장 (최대 3줄) */
  rationaleLines: LocalizedRationaleLine[];
};

function reasonWeightForKey(
  key: RecommendReasonKey,
  breakdown: {
    budget: number;
    region: number;
    industry: number;
    target: number;
    category: number;
    popularity: number;
  },
): number {
  switch (key) {
    case "budgetEfficient":
      return breakdown.budget / 100;
    case "matchRegion":
      return breakdown.region / 100;
    case "industryFit":
      return breakdown.industry / 100;
    case "ageMatch":
      return breakdown.target / 100;
    case "goalFit":
      return breakdown.category / 100;
    case "highVisibility":
      return breakdown.popularity / 100;
    default:
      return 0.5;
  }
}

/**
 * 매체 카탈로그에서 컨텍스트에 맞는 상위 N개 추천.
 * 스코어링은 `matchMediaCatalog` 단일 경로 (플래너 API·자동 포트폴리오와 동일).
 */
export function recommendPlannerMedia(
  catalog: readonly MediaItem[],
  ctx: RecommendationContext,
  limit = 8,
  seed = 0,
  locale = "ko",
): ScoredMedia[] {
  let pool = catalog.filter((m) => {
    if (ctx.categories.length === 0) return true;
    return (ctx.categories as readonly PlannerCategory[]).some((c) =>
      matchesPlannerCategory(m, c),
    );
  });
  if (ctx.regions.length > 0) {
    pool = filterCatalogByPlannerRegions(pool, ctx.regions);
  }
  if (
    ctx.regions.includes("busan") &&
    ctx.busanZones &&
    ctx.busanZones.length > 0
  ) {
    pool = pool.filter((m) => mediaMatchesBusanZones(m, ctx.busanZones!));
  }
  if (
    ctx.regions.includes("gyeonggi") &&
    ctx.gyeonggiZones &&
    ctx.gyeonggiZones.length > 0
  ) {
    pool = pool.filter((m) => mediaMatchesGyeonggiZones(m, ctx.gyeonggiZones!));
  }
  if (
    ctx.regions.includes("incheon") &&
    ctx.incheonZones &&
    ctx.incheonZones.length > 0
  ) {
    pool = pool.filter((m) => mediaMatchesIncheonZones(m, ctx.incheonZones!));
  }

  const matchingInput = plannerContextToMatching(ctx, seed);
  const display = displayContextFromPlannerContext(ctx);
  const matched = matchMediaCatalog(pool, matchingInput, limit);

  return matched.map((m) => {
    const keys = rationaleKeysFromBreakdown(m.breakdown);
    return {
      media: m.media,
      score: m.score / 100,
      reasons: keys.map((key) => ({
        key,
        weight: reasonWeightForKey(key, m.breakdown),
      })),
      rationaleLines: formatRecommendRationale(
        matchingInput,
        m.media,
        m.breakdown,
        locale,
        display,
      ),
    };
  });
}

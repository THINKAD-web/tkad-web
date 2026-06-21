import type { MediaItem } from "@/lib/media-data";
import { matchesPlannerCategory } from "@/lib/planner-logic";
import type { PlannerCategory } from "@/lib/planner/types";
import { matchMediaCatalog } from "@/lib/matching-engine";
import { plannerContextToMatching } from "@/lib/recommendation-adapters";

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
  /** 점수 기여도 상위 2–3개. UI 노출용. */
  reasons: RecommendReason[];
};

function reasonsFromBreakdown(
  breakdown: {
    budget: number;
    region: number;
    industry: number;
    target: number;
    category: number;
    popularity: number;
  },
): RecommendReason[] {
  const parts: RecommendReason[] = [];
  if (breakdown.budget >= 20) {
    parts.push({ key: "budgetEfficient", weight: breakdown.budget / 100 });
  }
  if (breakdown.region >= 15) {
    parts.push({ key: "matchRegion", weight: breakdown.region / 100 });
  }
  if (breakdown.industry >= 10) {
    parts.push({ key: "industryFit", weight: breakdown.industry / 100 });
  }
  if (breakdown.target >= 12) {
    parts.push({ key: "ageMatch", weight: breakdown.target / 100 });
  }
  if (breakdown.category >= 12) {
    parts.push({ key: "goalFit", weight: breakdown.category / 100 });
  }
  if (breakdown.popularity >= 5) {
    parts.push({ key: "highVisibility", weight: breakdown.popularity / 100 });
  }
  return parts.slice(0, 3);
}

/**
 * 매체 카탈로그에서 컨텍스트에 맞는 상위 N개 추천.
 * 스코어링은 `matchMediaCatalog` 단일 경로 (플래너 API·자동 포트폴리오와 동일).
 */
export function recommendPlannerMedia(
  catalog: readonly MediaItem[],
  ctx: RecommendationContext,
  limit = 5,
  seed = 0,
): ScoredMedia[] {
  const filteredByCategory = catalog.filter((m) => {
    if (ctx.categories.length === 0) return true;
    return (ctx.categories as readonly PlannerCategory[]).some((c) =>
      matchesPlannerCategory(m, c),
    );
  });

  const matchingInput = plannerContextToMatching(ctx, seed);
  const matched = matchMediaCatalog(filteredByCategory, matchingInput, limit);

  return matched.map((m) => ({
    media: m.media,
    score: m.score / 100,
    reasons: reasonsFromBreakdown(m.breakdown),
  }));
}

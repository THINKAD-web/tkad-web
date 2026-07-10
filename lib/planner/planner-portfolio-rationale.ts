import type { MediaItem } from "@/lib/media-data";
import { scoreMediaForRanking } from "@/lib/matching-engine";
import {
  displayContextFromPlannerContext,
  plannerContextToMatching,
} from "@/lib/recommendation-adapters";
import {
  formatRecommendRationale,
  rationaleKeysFromBreakdown,
  rationaleLinesForLocale,
} from "@/lib/recommend/recommend-rationale";
import type { ScoredMedia as PlannerScoredMedia } from "@/lib/planner/recommend";
import type { RecommendationContext } from "@/lib/planner/recommendation-context";

function reasonWeightForKey(
  key: PlannerScoredMedia["reasons"][number]["key"],
  breakdown: ReturnType<typeof scoreMediaForRanking>["breakdown"],
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

/** 플래너 컨텍스트 기준 포트폴리오 매체별 scored + rationaleLines */
export function buildPlannerPortfolioScored(
  portfolio: readonly MediaItem[],
  ctx: RecommendationContext,
  locale: string,
): PlannerScoredMedia[] {
  const matching = plannerContextToMatching(ctx);
  const display = displayContextFromPlannerContext(ctx);

  return portfolio.map((media) => {
    const ranked = scoreMediaForRanking(media, matching);
    const keys = rationaleKeysFromBreakdown(ranked.breakdown);
    return {
      media,
      score: ranked.score / 100,
      reasons: keys.map((key) => ({
        key,
        weight: reasonWeightForKey(key, ranked.breakdown),
      })),
      rationaleLines: formatRecommendRationale(
        matching,
        media,
        ranked.breakdown,
        locale,
        display,
      ),
    };
  });
}

/** PDF/PPTX·화면 export — recommendReason + rationaleLines 주입 */
export function enrichPlannerPortfolioForExport(
  portfolio: readonly MediaItem[],
  ctx: RecommendationContext,
  locale: string,
): MediaItem[] {
  const matching = plannerContextToMatching(ctx);
  const display = displayContextFromPlannerContext(ctx);

  return portfolio.map((media) => {
    const ranked = scoreMediaForRanking(media, matching);
    const lines = rationaleLinesForLocale(
      formatRecommendRationale(
        matching,
        media,
        ranked.breakdown,
        locale,
        display,
      ),
      locale,
    );
    if (lines.length === 0) return media;
    return {
      ...media,
      recommendReason: lines.slice(0, 2).join(" · "),
      rationaleLines: lines,
    };
  });
}

import type { AiRecommendInput } from "@/lib/ai-media-recommend";
import type { RecommendationContext } from "@/lib/planner/recommend";
import {
  matchingGoalFromRaw,
  matchingGoalTagsFromRaw,
} from "@/lib/planner/normalize-campaign-goal";
import type { MatchingInput, MatchedMedia, MatchingGoal } from "@/lib/matching-engine";
import type { ScoredMedia as AiScoredMedia } from "@/lib/ai-media-recommend";
import type { ScoredMedia as PlannerScoredMedia } from "@/lib/planner/recommend";
import { oneLineReason } from "@/lib/matching-engine";

const TARGET_MAP: Record<string, string> = {
  genz: "mz",
  millennial: "millennial",
  family: "family",
  biz: "worker",
  mass: "mass",
  mz: "mz",
  worker: "worker",
  tourist: "tourist",
};

import { PLANNER_INDUSTRY_TO_MATCHING } from "@/lib/planner/industry-match";
import { followUpGoalTags } from "@/lib/planner/goal-follow-up";
import { seoulZonesToMatchingRegions } from "@/lib/planner/seoul-zones";
import type { PlannerIndustryKey } from "@/lib/planner/types";

function toMatchingGoal(raw: string | null | undefined): MatchingGoal {
  return matchingGoalFromRaw(raw) as MatchingGoal;
}

export function aiInputToMatching(
  input: AiRecommendInput,
  seed = 0,
): MatchingInput {
  const regions: string[] = [];
  if (input.region && input.region !== "all") regions.push(input.region);
  if (input.locationKeywords?.length) {
    for (const k of input.locationKeywords) regions.push(k);
  }

  return {
    monthlyBudgetWon:
      input.budgetMaxMan > 0 ? input.budgetMaxMan * 10_000 : 0,
    regions,
    industry: input.industry,
    targets: [TARGET_MAP[input.target] ?? input.target],
    durationMonths: Math.max(
      1,
      Math.round((input.preferredPeriodWeeks ?? 4) / 4),
    ),
    goal: toMatchingGoal(input.goal),
    goalTags: matchingGoalTagsFromRaw(input.goal),
    categories:
      input.type && input.type !== "all" ? [input.type] : undefined,
    seed,
  };
}

export function plannerContextToMatching(
  ctx: RecommendationContext,
  seed = 0,
): MatchingInput {
  const monthlyBudgetWon =
    ctx.budgetMan > 0 && ctx.months > 0 ?
      (ctx.budgetMan * 10_000) / ctx.months
    : 0;

  const goalRaw = ctx.goal ?? "brand";
  const baseTags = matchingGoalTagsFromRaw(goalRaw);
  const followTags = followUpGoalTags(ctx.goal, ctx.goalFollowUp ?? {});
  const goalTags = [...new Set([...baseTags, ...followTags])];

  return {
    monthlyBudgetWon,
    regions: seoulZonesToMatchingRegions(
      ctx.regions,
      ctx.seoulZones ?? [],
    ),
    industry: ctx.industryKey ?
      (PLANNER_INDUSTRY_TO_MATCHING[ctx.industryKey as PlannerIndustryKey] ??
        "other")
    : "other",
    targets: ctx.ageKeys.length > 0 ? [] : ["mass"],
    plannerAgeKeys: ctx.ageKeys.length > 0 ? [...ctx.ageKeys] : undefined,
    durationMonths: Math.max(1, ctx.months),
    goal: toMatchingGoal(goalRaw),
    goalTags: goalTags.length > 0 ? goalTags : undefined,
    categories: ctx.categories.length > 0 ? [...ctx.categories] : undefined,
    seed,
  };
}

export function matchedToAiScored(
  matched: MatchedMedia[],
  isKo: boolean,
): AiScoredMedia[] {
  return matched.map((m) => ({
    item: m.media,
    score: m.score,
    reasons: m.reasons.length > 0 ? m.reasons : [
      {
        ko: m.reasoning ?? oneLineReason(m, "", [], true),
        en: m.reasoning ?? oneLineReason(m, "", [], false),
      },
    ],
  }));
}

export function matchedToPlannerScored(
  matched: MatchedMedia[],
): PlannerScoredMedia[] {
  return matched.map((m) => ({
    media: m.media,
    score: m.score / 100,
    reasons: [
      ...(m.breakdown.budget >= 20 ?
        [{ key: "budgetEfficient" as const, weight: m.breakdown.budget / 100 }]
      : []),
      ...(m.breakdown.region >= 15 ?
        [{ key: "matchRegion" as const, weight: m.breakdown.region / 100 }]
      : []),
      ...(m.breakdown.industry >= 10 ?
        [{ key: "goalFit" as const, weight: m.breakdown.industry / 100 }]
      : []),
      ...(m.breakdown.target >= 12 ?
        [{ key: "ageMatch" as const, weight: m.breakdown.target / 100 }]
      : []),
      ...(m.breakdown.popularity >= 5 ?
        [{ key: "highVisibility" as const, weight: m.breakdown.popularity / 100 }]
      : []),
    ],
  }));
}

export type ApiRecommendationItem = {
  mediaId: string;
  score: number;
  breakdown: MatchedMedia["breakdown"];
  reasons: MatchedMedia["reasons"];
  budgetAllocation: number;
  role: MatchedMedia["role"];
  reasoning?: string;
  expectedImpact?: string;
  priority: number;
  oneLine: string;
};

export function matchedToApiItems(
  matched: MatchedMedia[],
  industry: string,
  targets: string[],
  isKo: boolean,
): ApiRecommendationItem[] {
  return matched.map((m) => ({
    mediaId: m.media.id,
    score: m.score,
    breakdown: m.breakdown,
    reasons: m.reasons,
    budgetAllocation: m.budgetAllocation,
    role: m.role,
    reasoning: m.reasoning,
    expectedImpact: m.expectedImpact,
    priority: m.priority,
    oneLine:
      m.reasoning ??
      oneLineReason(m, industry, targets, isKo),
  }));
}

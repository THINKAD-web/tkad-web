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
import {
  displayContextFromAiInput,
  displayContextFromPlannerContext,
  formatRecommendRationale,
  rationaleKeysFromBreakdown,
  rationaleLinesForLocale,
  rationaleSummaryLine,
  type LocalizedRationaleLine,
  type RecommendRationaleDisplayContext,
} from "@/lib/recommend/recommend-rationale";

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
import { mergePlannerMacroMatchingRegions } from "@/lib/planner/busan-zones";
import type { PlannerIndustryKey } from "@/lib/planner/types";
import { isNonSpecificRegionCode } from "@/lib/recommend/recommend-region-filter";

function toMatchingGoal(raw: string | null | undefined): MatchingGoal {
  return matchingGoalFromRaw(raw) as MatchingGoal;
}

export function aiInputToMatching(
  input: AiRecommendInput,
  seed = 0,
): MatchingInput {
  const macroRegions = (input.regionCodes ?? []).filter(
    (c) => c.trim().length > 0 && !isNonSpecificRegionCode(c),
  );

  const wantsNationalScoring =
    input.regionCodes?.includes("national") ||
    /전국|nationwide/i.test(input.freetextSource?.trim() ?? "");

  const seoulZones = input.seoulZones ?? [];
  const busanZones = input.busanZones ?? [];
  const regions = mergePlannerMacroMatchingRegions(
    macroRegions,
    seoulZones,
    busanZones,
  );

  if (wantsNationalScoring && !regions.includes("national")) {
    regions.push("national");
  }

  if (input.locationKeywords?.length) {
    for (const k of input.locationKeywords) {
      const trimmed = k.trim();
      if (trimmed.length > 0 && !regions.includes(trimmed)) {
        regions.push(trimmed);
      }
    }
  }

  const weeks = input.preferredPeriodWeeks ?? 4;
  const durationDays =
    weeks > 0 && weeks < 4 ? Math.max(1, Math.round(weeks * 7)) : undefined;

  return {
    monthlyBudgetWon:
      input.budgetMaxMan > 0 ? input.budgetMaxMan * 10_000 : 0,
    regions,
    industry: input.industry,
    targets: [TARGET_MAP[input.target] ?? input.target],
    durationMonths: Math.max(1, Math.round(weeks / 4)),
    durationDays,
    goal: toMatchingGoal(input.goal),
    goalTags: matchingGoalTagsFromRaw(input.goal),
    categories: (() => {
      if (input.plannerCategories?.length) {
        return [...input.plannerCategories];
      }
      if (input.type && input.type !== "all") return [input.type];
      return undefined;
    })(),
    seed,
    ...(input.mediaIntents?.length ? { mediaIntents: [...input.mediaIntents] } : {}),
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

  const durationDays =
    ctx.durationDays ?? ctx.goalFollowUp?.eventDurationDays ?? undefined;

  return {
    monthlyBudgetWon,
    regions: mergePlannerMacroMatchingRegions(
      ctx.regions,
      ctx.seoulZones ?? [],
      ctx.busanZones ?? [],
    ),
    industry: ctx.industryKey ?
      (PLANNER_INDUSTRY_TO_MATCHING[ctx.industryKey as PlannerIndustryKey] ??
        "other")
    : "other",
    targets: ctx.ageKeys.length > 0 ? [] : ["mass"],
    plannerAgeKeys: ctx.ageKeys.length > 0 ? [...ctx.ageKeys] : undefined,
    durationMonths: Math.max(1, ctx.months),
    durationDays,
    goal: toMatchingGoal(goalRaw),
    goalTags: goalTags.length > 0 ? goalTags : undefined,
    categories: ctx.categories.length > 0 ? [...ctx.categories] : undefined,
    seed,
  };
}

function buildRationaleBundle(
  input: MatchingInput,
  m: MatchedMedia,
  locale: string,
  display?: RecommendRationaleDisplayContext,
): { lines: LocalizedRationaleLine[]; reasons: MatchedMedia["reasons"] } {
  const lines = formatRecommendRationale(
    input,
    m.media,
    m.breakdown,
    locale,
    display,
  );
  return {
    lines,
    reasons: lines.map((l) => ({ ko: l.ko, en: l.en })),
  };
}

export function matchedToAiScored(
  matched: MatchedMedia[],
  isKo: boolean,
  input?: MatchingInput,
  display?: RecommendRationaleDisplayContext,
): AiScoredMedia[] {
  const locale = isKo ? "ko" : "en";
  return matched.map((m) => {
    const bundle =
      input ?
        buildRationaleBundle(input, m, locale, display)
      : { lines: m.reasons.map((r) => ({ ko: r.ko, en: r.en })), reasons: m.reasons };
    return {
      item: m.media,
      score: m.score,
      reasons: bundle.reasons.length > 0 ? bundle.reasons : [
        {
          ko: m.reasoning ?? oneLineReason(m, "", [], true),
          en: m.reasoning ?? oneLineReason(m, "", [], false),
        },
      ],
      rationaleLines: bundle.lines,
    };
  });
}

export function matchedToPlannerScored(
  matched: MatchedMedia[],
  input: MatchingInput,
  ctx: RecommendationContext,
  locale = "ko",
): PlannerScoredMedia[] {
  const display = displayContextFromPlannerContext(ctx);
  return matched.map((m) => {
    const keys = rationaleKeysFromBreakdown(m.breakdown);
    return {
      media: m.media,
      score: m.score / 100,
      reasons: keys.map((key) => ({
        key,
        weight:
          key === "budgetEfficient" ? m.breakdown.budget / 100
          : key === "matchRegion" ? m.breakdown.region / 100
          : key === "industryFit" ? m.breakdown.industry / 100
          : key === "ageMatch" ? m.breakdown.target / 100
          : key === "goalFit" ? m.breakdown.category / 100
          : m.breakdown.popularity / 100,
      })),
      rationaleLines: formatRecommendRationale(
        input,
        m.media,
        m.breakdown,
        locale,
        display,
      ),
    };
  });
}

export type ApiRecommendationItem = {
  mediaId: string;
  score: number;
  breakdown: MatchedMedia["breakdown"];
  reasons: MatchedMedia["reasons"];
  rationaleLines: LocalizedRationaleLine[];
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
  input?: MatchingInput,
  display?: RecommendRationaleDisplayContext,
): ApiRecommendationItem[] {
  const locale = isKo ? "ko" : "en";
  return matched.map((m) => {
    const lines =
      input ?
        formatRecommendRationale(input, m.media, m.breakdown, locale, display)
      : m.reasons.map((r) => ({ ko: r.ko, en: r.en }));
    const reasons = lines.map((l) => ({ ko: l.ko, en: l.en }));
  return {
    mediaId: m.media.id,
    score: m.score,
    breakdown: m.breakdown,
    reasons,
    rationaleLines: lines,
    budgetAllocation: m.budgetAllocation,
    role: m.role,
    reasoning: m.reasoning,
    expectedImpact: m.expectedImpact,
    priority: m.priority,
    oneLine:
      m.reasoning ??
      rationaleSummaryLine(lines, locale) ??
      oneLineReason(m, industry, targets, isKo),
  };
  });
}

export {
  displayContextFromAiInput,
  displayContextFromPlannerContext,
  rationaleLinesForLocale,
  rationaleSummaryLine,
};

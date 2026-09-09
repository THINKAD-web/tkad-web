import type { AiRecommendInput } from "@/lib/ai-media-recommend";
import { aiInputToMatching } from "@/lib/recommendation-adapters";
import type { MatchingInput } from "@/lib/matching-engine";
import { PLANNER_INDUSTRY_TO_MATCHING } from "@/lib/planner/industry-match";
import type { PlannerCampaignGoal } from "@/lib/planner-logic";
import type { PlannerIndustryKey } from "@/lib/planner/types";
import {
  bucketMonthlyBudgetWon,
  getMinPatternStatsSampleThreshold,
} from "@/lib/recommend/pattern-stats-config";
import { dimensionsFromLog } from "@/lib/recommend/pattern-stats-dimensions";
import type { PatternComboDimensions } from "@/lib/recommend/pattern-stats-types";
import type { BuildOnlineReportPayloadArgs } from "@/lib/planner-report-export/payload-online";
import type { BuildOohPayloadArgs } from "@/lib/planner-report-export/payload-ooh";

export function formatPatternStatsNote(count: number, isKo: boolean): string {
  const n = count.toLocaleString(isKo ? "ko-KR" : "en-US");
  return isKo
    ? `비슷한 조건(업종·타깃·예산·목표)으로 추천·문의된 사례가 ${n}건 있습니다.`
    : `Similar campaigns (industry, target, budget, goal) were recommended or inquired ${n} times.`;
}

export function appendPatternStatsOperationalNote(
  notes: readonly string[],
  count: number | null | undefined,
  isKo: boolean,
): string[] {
  if (count == null || count < getMinPatternStatsSampleThreshold()) {
    return [...notes];
  }
  const line = formatPatternStatsNote(count, isKo);
  if (notes.includes(line)) return [...notes];
  return [...notes, line];
}

export function patternComboFromMatchingInput(
  source: PatternComboDimensions["source"],
  input: Pick<
    MatchingInput,
    "industry" | "targets" | "goal" | "monthlyBudgetWon"
  >,
): PatternComboDimensions {
  return dimensionsFromLog(source, {
    industry: input.industry,
    targets: input.targets,
    goal: String(input.goal),
    monthlyBudgetWon: input.monthlyBudgetWon,
  });
}

export function patternComboFromAiInput(input: AiRecommendInput): PatternComboDimensions {
  return patternComboFromMatchingInput("recommend", aiInputToMatching(input, 0));
}

/** Brief / log vocabulary — not PlannerCampaignGoal (`sales` ≠ `conversion`). */
export function patternComboFromPlannerBrief(args: {
  briefGoal: string | null | undefined;
  industryKey?: PlannerIndustryKey | null;
  budgetMan: number;
  months: number;
}): PatternComboDimensions {
  const industry =
    args.industryKey ?
      (PLANNER_INDUSTRY_TO_MATCHING[args.industryKey] ?? "other")
    : "other";
  const months = Math.max(1, args.months ?? 1);
  const monthlyBudgetWon =
    args.budgetMan > 0 ? (args.budgetMan * 10_000) / months : 0;

  return {
    source: "planner",
    industry,
    target: "mass",
    budgetBucket: bucketMonthlyBudgetWon(monthlyBudgetWon),
    goal: (args.briefGoal?.trim() || "awareness").toLowerCase(),
  };
}

export function patternComboFromOnlineExportArgs(
  args: Pick<
    BuildOnlineReportPayloadArgs,
    "industryKey" | "campaignGoal" | "budgetMan" | "months"
  > & { briefGoal?: string | null },
): PatternComboDimensions {
  if (args.briefGoal != null && args.briefGoal !== "") {
    return patternComboFromPlannerBrief({
      briefGoal: args.briefGoal,
      industryKey: args.industryKey as PlannerIndustryKey | null,
      budgetMan: args.budgetMan,
      months: args.months ?? 1,
    });
  }

  const plannerGoal = (args.campaignGoal ?? "brand") as PlannerCampaignGoal;
  const briefGoalFromPlanner =
    plannerGoal === "sales" ? "conversion" : String(plannerGoal).toLowerCase();

  return patternComboFromPlannerBrief({
    briefGoal: briefGoalFromPlanner,
    industryKey: args.industryKey as PlannerIndustryKey | null,
    budgetMan: args.budgetMan,
    months: args.months ?? 1,
  });
}

export function patternComboFromOohExportArgs(
  args: Pick<
    BuildOohPayloadArgs,
    "industryKey" | "campaignGoal" | "budgetMan" | "months"
  >,
): PatternComboDimensions {
  return patternComboFromOnlineExportArgs(args);
}

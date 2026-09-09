import { bucketMonthlyBudgetWon } from "@/lib/recommend/pattern-stats-config";
import type {
  PatternComboDimensions,
  PatternStatsSource,
  RecommendationLogInputJson,
} from "@/lib/recommend/pattern-stats-types";

function normalizeIndustry(raw: unknown): string {
  if (typeof raw !== "string" || !raw.trim()) return "other";
  return raw.trim().toLowerCase();
}

function normalizeTarget(input: RecommendationLogInputJson): string {
  const first = input.targets?.[0];
  if (typeof first === "string" && first.trim()) return first.trim().toLowerCase();
  return "mass";
}

function normalizeGoal(raw: unknown): string {
  if (typeof raw !== "string" || !raw.trim()) return "awareness";
  return raw.trim().toLowerCase();
}

export function dimensionsFromLog(
  source: PatternStatsSource,
  input: RecommendationLogInputJson,
): PatternComboDimensions {
  return {
    source,
    industry: normalizeIndustry(input.industry),
    target: normalizeTarget(input),
    budgetBucket: bucketMonthlyBudgetWon(Number(input.monthlyBudgetWon ?? 0)),
    goal: normalizeGoal(input.goal),
  };
}

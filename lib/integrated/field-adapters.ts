import type { PlannerAgeKey, PlannerCampaignGoal, PlannerIndustryKey } from "@/lib/planner/types";
import type { RecommendationContext } from "@/lib/planner/recommendation-context";
import { PLANNER_DEFAULT_CATEGORIES } from "@/lib/planner/types";

export type DigitalMixPayload = {
  industry: string;
  goal: string;
  target: { age: string; gender: string; geo: string };
  budgetMonthly: number;
  periodWeeks: number;
  channelType: "integrated";
};

const GOAL_TO_DIGITAL: Record<PlannerCampaignGoal, string> = {
  brand: "AWARENESS",
  launch: "AWARENESS",
  event: "TRAFFIC",
  sales: "CONVERSION",
  local: "VISIT",
};

const INDUSTRY_TO_DIGITAL: Record<PlannerIndustryKey, string> = {
  indFb: "FNB",
  indRetail: "ECOMMERCE",
  indTech: "APP",
  indFinance: "B2B",
  indEnt: "ENTER",
  indOther: "LOCAL",
};

const AGE_TO_TARGET: Record<PlannerAgeKey, string> = {
  ageAll: "25-34",
  age20s: "18-24",
  age30s: "25-34",
  age40s: "35-44",
  age50plus: "45+",
};

export function mapOohGoalToDigitalGoal(goal: PlannerCampaignGoal): string {
  return GOAL_TO_DIGITAL[goal] ?? "AWARENESS";
}

export function mapOohIndustryToDigital(industry: PlannerIndustryKey): string {
  return INDUSTRY_TO_DIGITAL[industry] ?? "LOCAL";
}

export function ageKeysToDigitalTargetAge(ageKeys: PlannerAgeKey[]): string {
  if (ageKeys.length === 0) return "25-34";
  const parts = ageKeys
    .filter((k) => k !== "ageAll")
    .map((k) => AGE_TO_TARGET[k]);
  return parts.length > 0 ? parts.join(",") : "25-34";
}

export function regionsToDigitalGeo(regions: string[]): string {
  if (regions.includes("national")) return "KR";
  const trimmed = regions.map((r) => r.trim()).filter(Boolean);
  return trimmed.slice(0, 3).join(",") || "KR";
}

export function genderToDigitalTarget(
  gender: "ALL" | "M" | "F" | undefined,
): string {
  if (!gender || gender === "ALL") return "ALL";
  return gender;
}

export function buildDigitalMixPayload(opts: {
  goal: PlannerCampaignGoal;
  industry: PlannerIndustryKey;
  regions: string[];
  ageKeys: PlannerAgeKey[];
  gender?: "ALL" | "M" | "F";
  digitalBudgetWon: number;
  periodMonths: number;
}): DigitalMixPayload {
  return {
    industry: mapOohIndustryToDigital(opts.industry),
    goal: mapOohGoalToDigitalGoal(opts.goal),
    target: {
      age: ageKeysToDigitalTargetAge(opts.ageKeys),
      gender: genderToDigitalTarget(opts.gender),
      geo: regionsToDigitalGeo(opts.regions),
    },
    budgetMonthly: Math.max(
      500_000,
      Math.round(opts.digitalBudgetWon / Math.max(1, opts.periodMonths)),
    ),
    periodWeeks: Math.max(1, Math.min(52, opts.periodMonths * 4)),
    channelType: "integrated",
  };
}

export function buildOohRecommendationContext(opts: {
  goal: PlannerCampaignGoal;
  regions: string[];
  ageKeys: PlannerAgeKey[];
  industry: PlannerIndustryKey;
  oohBudgetMan: number;
  periodMonths: number;
}): RecommendationContext {
  return {
    goal: opts.goal,
    regions: opts.regions,
    categories: [...PLANNER_DEFAULT_CATEGORIES],
    ageKeys: opts.ageKeys,
    industryKey: opts.industry,
    budgetMan: opts.oohBudgetMan,
    months: opts.periodMonths,
  };
}

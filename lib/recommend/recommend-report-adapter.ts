import type {
  AiRecommendInput,
  CampaignGoal,
  Industry,
  TargetAudience,
} from "@/lib/ai-media-recommend";
import type { MediaItem } from "@/lib/media-data";
import type { RegionCheckboxCode } from "@/components/media-ai-recommend-form";
import {
  comparePlansByDuration,
  computePlannerMetrics,
  computePlannerPortfolioBudgetStatus,
  computePlannerPortfolioMonthlyMan,
  plannerReportCategoryKey,
  reachSplitForGoal,
  type PlannerCampaignGoal,
  type PlannerCategory,
  type PlannerMetrics,
} from "@/lib/planner-logic";
import { normalizeCampaignGoal } from "@/lib/planner/normalize-campaign-goal";
import { plannerRegionLabel } from "@/lib/planner/planner-regions";
import {
  type CampaignMediaPriceOptionIndex,
  type CampaignMediaQuantities,
  type PlannerPortfolioPricing,
} from "@/lib/planner/planner-media-quantity";
import { formatSeoulZonesText } from "@/lib/planner/seoul-zones";
import {
  PLANNER_BUDGET_MIN,
  type PlannerAgeKey,
  type PlannerIndustryKey,
} from "@/lib/planner/types";

export function recommendGoalToPlannerCampaignGoal(
  goal: CampaignGoal,
): PlannerCampaignGoal {
  const normalized = normalizeCampaignGoal(goal);
  if (goal === "consideration" || goal === "conversion") return "sales";
  return normalized.displayKey;
}

export function recommendIndustryToPlannerIndustryKey(
  industry: Industry,
): PlannerIndustryKey {
  switch (industry) {
    case "beauty":
      return "indRetail";
    case "retail":
    case "fmcg":
      return "indRetail";
    case "fintech":
      return "indFinance";
    case "entertainment":
      return "indEnt";
    default:
      return "indOther";
  }
}

export function recommendTargetToAgeKeys(
  target: TargetAudience,
): PlannerAgeKey[] {
  switch (target) {
    case "genz":
      return ["age20s"];
    case "millennial":
      return ["age20s", "age30s"];
    case "family":
      return ["age40s"];
    case "biz":
      return ["age30s", "age40s"];
    case "mass":
    default:
      return [];
  }
}

export function recommendTypeToPlannerCategories(
  type: string | undefined,
): PlannerCategory[] {
  if (type === "digital" || type === "static" || type === "mobile") {
    return [type];
  }
  return [];
}

export function resolveRecommendReportBudgetMan(
  portfolio: readonly MediaItem[],
  budgetMaxMan: number,
  pricing: PlannerPortfolioPricing,
): number {
  if (Number.isFinite(budgetMaxMan) && budgetMaxMan >= PLANNER_BUDGET_MIN) {
    return Math.round(budgetMaxMan);
  }
  const monthlyTotalMan = computePlannerPortfolioMonthlyMan(portfolio, pricing);
  if (monthlyTotalMan >= PLANNER_BUDGET_MIN) return monthlyTotalMan;
  if (monthlyTotalMan > 0) return PLANNER_BUDGET_MIN;
  return PLANNER_BUDGET_MIN;
}

export function resolveRecommendReportMonths(
  preferredPeriodWeeks: number | undefined,
): number {
  return Math.max(1, Math.round((preferredPeriodWeeks ?? 4) / 4));
}

export function buildRecommendRegionsText(args: {
  regionCodes: readonly RegionCheckboxCode[];
  seoulZones?: AiRecommendInput["seoulZones"];
  locale: string;
  nationalShort: string;
}): string {
  const parts = args.regionCodes.map((code) =>
    plannerRegionLabel(code, args.locale, args.nationalShort),
  );
  if (args.regionCodes.includes("seoul") && args.seoulZones?.length) {
    parts.push(formatSeoulZonesText(args.seoulZones, args.locale === "ko"));
  }
  if (parts.length === 0) {
    return args.locale === "ko" ? "전국" : "National";
  }
  return parts.join(", ");
}

export function inferRecommendCategoriesText(
  portfolio: readonly MediaItem[],
  isKo: boolean,
): string {
  const keys = new Set<string>();
  for (const m of portfolio) {
    const key = plannerReportCategoryKey(m);
    if (key === "digital") keys.add(isKo ? "디지털" : "Digital");
    else if (key === "static") keys.add(isKo ? "고정형" : "Static");
    else if (key === "mobile") keys.add(isKo ? "이동형" : "Mobile");
  }
  return [...keys].join(", ") || (isKo ? "혼합" : "Mixed");
}

export type RecommendReportContext = {
  campaignGoal: PlannerCampaignGoal;
  industryKey: PlannerIndustryKey;
  ageKeys: PlannerAgeKey[];
  categories: PlannerCategory[];
  budgetNum: number;
  months: number;
  regionsText: string;
  categoriesText: string;
  pricing: PlannerPortfolioPricing;
};

export function buildRecommendReportContext(args: {
  input: AiRecommendInput;
  regionCodes: readonly RegionCheckboxCode[];
  portfolio: readonly MediaItem[];
  quantities: CampaignMediaQuantities;
  priceOptionIndex: CampaignMediaPriceOptionIndex;
  locale: string;
  nationalShort: string;
  categoriesText: string;
  regionsText?: string;
}): RecommendReportContext {
  const pricing: PlannerPortfolioPricing = {
    quantities: args.quantities,
    priceOptionIndex: args.priceOptionIndex,
  };
  const campaignGoal = recommendGoalToPlannerCampaignGoal(args.input.goal);
  const industryKey = recommendIndustryToPlannerIndustryKey(args.input.industry);
  const ageKeys = recommendTargetToAgeKeys(args.input.target);
  const categories = recommendTypeToPlannerCategories(args.input.type);
  const budgetNum = resolveRecommendReportBudgetMan(
    args.portfolio,
    args.input.budgetMaxMan,
    pricing,
  );
  const months = resolveRecommendReportMonths(args.input.preferredPeriodWeeks);
  const regionsText =
    args.regionsText ??
    buildRecommendRegionsText({
      regionCodes: args.regionCodes,
      seoulZones: args.input.seoulZones,
      locale: args.locale,
      nationalShort: args.nationalShort,
    });
  const categoriesText =
    args.categoriesText ||
    inferRecommendCategoriesText(args.portfolio, args.locale === "ko");

  return {
    campaignGoal,
    industryKey,
    ageKeys,
    categories,
    budgetNum,
    months,
    regionsText,
    categoriesText,
    pricing,
  };
}

export type RecommendReportMetricsBundle = {
  metrics: PlannerMetrics | null;
  portfolioBudgetStatus: ReturnType<typeof computePlannerPortfolioBudgetStatus>;
  monthCompare: { months: number; totalImpressions: number }[];
  reachCorePct: number;
  reachExtendedPct: number;
};

export function computeRecommendReportMetrics(args: {
  portfolio: readonly MediaItem[];
  matchedPool: readonly MediaItem[];
  context: RecommendReportContext;
}): RecommendReportMetricsBundle {
  const { portfolio, matchedPool, context } = args;
  const source = portfolio.length > 0 ? portfolio : matchedPool;
  const metrics =
    source.length > 0 && context.budgetNum >= PLANNER_BUDGET_MIN
      ? computePlannerMetrics(source, context.budgetNum, context.months, {
          campaignGoal: context.campaignGoal,
          industryKey: context.industryKey,
          goalFollowUp: {},
          pricing: context.pricing,
        })
      : null;
  const portfolioBudgetStatus = computePlannerPortfolioBudgetStatus(
    portfolio,
    context.budgetNum,
    context.months,
    context.pricing,
  );
  const monthCompare = comparePlansByDuration(
    matchedPool.length > 0 ? matchedPool : portfolio,
    context.budgetNum,
    [1, 3, 6],
  );
  const reachSplit = reachSplitForGoal(context.campaignGoal);
  return {
    metrics,
    portfolioBudgetStatus,
    monthCompare,
    reachCorePct: reachSplit.corePct,
    reachExtendedPct: reachSplit.extendedPct,
  };
}

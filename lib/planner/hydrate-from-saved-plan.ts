import type { CompositeLogoPlacement } from "@/components/planner/composite-preview";
import type { SavedPlannerPlanJson } from "@/lib/planner/contact-prefill";
import {
  isPlannerAgeKey,
  isPlannerIndustryKey,
  normalizePlannerAgeKeys,
  normalizePlannerCategories,
  PLANNER_BUDGET_MIN,
  type PlannerCampaignGoal,
} from "@/lib/planner/types";
import type { PlannerStoreState } from "@/lib/planner/store";

/** DB `planJson` → 플래너 스토어 입력 필드 */
export function hydratePlannerFromSavedPlan(
  plan: SavedPlannerPlanJson,
): Partial<PlannerStoreState> {
  return {
    campaignGoal: (plan.campaignGoal as PlannerCampaignGoal | null) ?? null,
    regions: Array.isArray(plan.regions) ? plan.regions : [],
    categories: normalizePlannerCategories(plan.categories),
    budget:
      typeof plan.budget === "string" && plan.budget.trim()
        ? plan.budget
        : String(PLANNER_BUDGET_MIN),
    months: typeof plan.months === "number" && plan.months > 0 ? plan.months : 1,
    ageKeys: normalizePlannerAgeKeys(
      plan.ageKeys ?? (isPlannerAgeKey(plan.ageKey) ? plan.ageKey : "ageAll"),
    ),
    industryKey: isPlannerIndustryKey(plan.industryKey)
      ? plan.industryKey
      : "indOther",
    campaignMediaIds: Array.isArray(plan.campaignMediaIds)
      ? plan.campaignMediaIds.filter((id): id is string => typeof id === "string")
      : [],
    creativeUploadedUrl: plan.creativeUploadedUrl ?? null,
    mediaPlacements:
      plan.mediaPlacements &&
      typeof plan.mediaPlacements === "object" &&
      !Array.isArray(plan.mediaPlacements)
        ? (plan.mediaPlacements as Record<string, CompositeLogoPlacement>)
        : {},
  };
}

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
import {
  pruneCampaignMediaQuantities,
  pruneCampaignMediaPriceOptionIndex,
  type CampaignMediaQuantities,
  type CampaignMediaPriceOptionIndex,
} from "@/lib/planner/planner-media-quantity";

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
    campaignMediaQuantities: (() => {
      const ids = Array.isArray(plan.campaignMediaIds)
        ? plan.campaignMediaIds.filter((id): id is string => typeof id === "string")
        : [];
      const raw = plan.campaignMediaQuantities;
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        return {};
      }
      const qty: CampaignMediaQuantities = {};
      for (const [id, v] of Object.entries(raw)) {
        const n = typeof v === "number" ? v : Number(v);
        if (Number.isFinite(n) && n > 0) qty[id] = Math.round(n);
      }
      return pruneCampaignMediaQuantities(ids, qty);
    })(),
    campaignMediaPriceOptionIndex: (() => {
      const ids = Array.isArray(plan.campaignMediaIds)
        ? plan.campaignMediaIds.filter((id): id is string => typeof id === "string")
        : [];
      const raw = plan.campaignMediaPriceOptionIndex;
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        return {};
      }
      const idx: CampaignMediaPriceOptionIndex = {};
      for (const [id, v] of Object.entries(raw)) {
        const n = typeof v === "number" ? v : Number(v);
        if (Number.isFinite(n) && n >= 0) idx[id] = Math.round(n);
      }
      return pruneCampaignMediaPriceOptionIndex(ids, idx);
    })(),
    creativeUploadedUrl: plan.creativeUploadedUrl ?? null,
    mediaPlacements:
      plan.mediaPlacements &&
      typeof plan.mediaPlacements === "object" &&
      !Array.isArray(plan.mediaPlacements)
        ? (plan.mediaPlacements as Record<string, CompositeLogoPlacement>)
        : {},
    reportClientName:
      typeof plan.reportClientName === "string" ? plan.reportClientName : "",
    reportDocumentTitle:
      typeof plan.reportDocumentTitle === "string"
        ? plan.reportDocumentTitle
        : "",
    reportGreeting:
      typeof plan.reportGreeting === "string" ? plan.reportGreeting : "",
    reportExecutiveSummary:
      typeof plan.reportExecutiveSummary === "string"
        ? plan.reportExecutiveSummary
        : "",
    reportGreetingTouched: plan.reportGreetingTouched === true,
    reportExecutiveSummaryTouched:
      plan.reportExecutiveSummaryTouched === true,
    reportCopyFingerprint:
      typeof plan.reportCopyFingerprint === "string"
        ? plan.reportCopyFingerprint
        : null,
  };
}

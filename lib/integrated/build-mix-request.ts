import type { IntegratedMixRequest } from "@/lib/integrated/schemas";
import {
  selectIntegratedBudgetNum,
  type IntegratedPlannerStoreState,
} from "@/lib/planner/integrated-store";
import type { PlannerCampaignGoal } from "@/lib/planner/types";

export function buildIntegratedMixRequest(opts: {
  campaignGoal: PlannerCampaignGoal | null;
  industryKey: IntegratedPlannerStoreState["industryKey"];
  regions: string[];
  ageKeys: IntegratedPlannerStoreState["ageKeys"];
  budgetMan: number;
  months: number;
  digitalBudgetPct: number;
  selectedOohMediaIds: string[];
  locale: "ko" | "en";
}): IntegratedMixRequest | null {
  const { campaignGoal, regions, budgetMan } = opts;
  if (!campaignGoal || regions.length === 0 || budgetMan <= 0) return null;

  return {
    channelType: "integrated",
    goal: campaignGoal,
    industry: opts.industryKey,
    regions,
    ageKeys: opts.ageKeys.length > 0 ? opts.ageKeys : undefined,
    budgetTotalWon: budgetMan * 10_000,
    periodMonths: Math.max(1, Math.round(opts.months)),
    digitalBudgetPct: opts.digitalBudgetPct,
    selectedOohMediaIds:
      opts.selectedOohMediaIds.length > 0
        ? opts.selectedOohMediaIds
        : undefined,
    locale: opts.locale,
  };
}

export function buildIntegratedMixRequestFromStore(
  state: IntegratedPlannerStoreState,
  locale: "ko" | "en",
): IntegratedMixRequest | null {
  return buildIntegratedMixRequest({
    campaignGoal: state.campaignGoal,
    industryKey: state.industryKey,
    regions: state.regions,
    ageKeys: state.ageKeys,
    budgetMan: selectIntegratedBudgetNum(state),
    months: state.months,
    digitalBudgetPct: state.digitalBudgetPct,
    selectedOohMediaIds: state.campaignMediaIds,
    locale,
  });
}

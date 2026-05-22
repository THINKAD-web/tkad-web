import { PLANNER_BUDGET_MIN } from "@/lib/planner/types";
import {
  selectIntegratedBudgetNum,
  type IntegratedPlannerStoreState,
} from "@/lib/planner/integrated-store";
import type { IntegratedWizardStep } from "@/lib/planner/integrated-types";

export type IntegratedStepCheck =
  | { ok: true }
  | { ok: false; errorKey: string };

export function canProceedIntegratedStep(
  state: IntegratedPlannerStoreState,
  step: IntegratedWizardStep,
): IntegratedStepCheck {
  switch (step) {
    case 1:
      return state.campaignGoal
        ? { ok: true }
        : { ok: false, errorKey: "selectGoal" };
    case 2:
      return state.regions.length > 0
        ? { ok: true }
        : { ok: false, errorKey: "selectRegion" };
    case 3:
      return selectIntegratedBudgetNum(state) >= PLANNER_BUDGET_MIN
        ? { ok: true }
        : { ok: false, errorKey: "needBudget" };
    case 4:
      return state.campaignMediaIds.length > 0
        ? { ok: true }
        : { ok: false, errorKey: "needMediaPick" };
    case 5:
      return state.digitalChannelIds.length > 0
        ? { ok: true }
        : { ok: false, errorKey: "needDigitalChannel" };
    default:
      return { ok: true };
  }
}

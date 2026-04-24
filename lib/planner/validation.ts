import {
  PLANNER_BUDGET_MIN,
  type PlannerWizardStep,
} from "@/lib/planner/types";
import {
  selectBudgetNum,
  type PlannerStoreState,
} from "@/lib/planner/store";

export type PlannerStepCheck =
  | { ok: true }
  | { ok: false; errorKey: PlannerErrorKey };

/** next-intl 키. i18n 메시지 번들과 1:1 대응되어야 한다. */
export type PlannerErrorKey =
  | "selectGoal"
  | "needMediaPick"
  | "needBudget"
  | "selectRegion";

/**
 * 현재 단계에서 다음 단계로 이동 가능한지 여부를 판정.
 * 기존 `planner-page-client.tsx`의 `goNext()` 검증 로직을 그대로 이관.
 */
export function canProceedFromStep(
  state: PlannerStoreState,
  step: PlannerWizardStep,
): PlannerStepCheck {
  switch (step) {
    case 1:
      return state.campaignGoal
        ? { ok: true }
        : { ok: false, errorKey: "selectGoal" };
    case 2:
      return state.campaignMediaIds.length > 0
        ? { ok: true }
        : { ok: false, errorKey: "needMediaPick" };
    case 4:
      return selectBudgetNum(state) >= PLANNER_BUDGET_MIN
        ? { ok: true }
        : { ok: false, errorKey: "needBudget" };
    case 5:
      return state.regions.length > 0
        ? { ok: true }
        : { ok: false, errorKey: "selectRegion" };
    default:
      return { ok: true };
  }
}

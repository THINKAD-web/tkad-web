import {
  PLANNER_RESULT_STEP,
  type PlannerWizardStep,
} from "@/lib/planner/types";
import type { PlannerStoreState } from "@/lib/planner/store";
import { canProceedFromStep } from "@/lib/planner/validation";

/** 내 플랜 카트 → 플래너: 필수 입력이 채워져 있으면 보고서 단계로 */
export function resolveWizardStepAfterPlanCartImport(
  state: PlannerStoreState,
): PlannerWizardStep {
  for (const step of [1, 2, 3, 4] as const) {
    if (!canProceedFromStep(state, step).ok) return 4;
  }
  return PLANNER_RESULT_STEP;
}

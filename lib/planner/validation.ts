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
  | "needBrandName"
  | "needMediaPick"
  | "needBudget"
  | "selectRegion"
  | "needFlightDates"
  | "aiRecommendPending";

/**
 * 4단계 위저드:
 *   1. 브랜드 · 목적 · 타깃
 *   2. 예산 · 일정 · 지역
 *   3. AI 추천 결과 (매체 1개 이상)
 *   4. 저장 · 공유 (자유 진행)
 */
export function canProceedFromStep(
  state: PlannerStoreState,
  step: PlannerWizardStep,
): PlannerStepCheck {
  switch (step) {
    case 1:
      if (!state.brandName.trim()) {
        return { ok: false, errorKey: "needBrandName" };
      }
      return state.campaignPurposes.length > 0 && state.campaignGoal
        ? { ok: true }
        : { ok: false, errorKey: "selectGoal" };
    case 2:
      if (selectBudgetNum(state) < PLANNER_BUDGET_MIN) {
        return { ok: false, errorKey: "needBudget" };
      }
      if (state.regions.length === 0) {
        return { ok: false, errorKey: "selectRegion" };
      }
      if (state.flightStart && state.flightEnd) {
        if (state.flightEnd < state.flightStart) {
          return { ok: false, errorKey: "needFlightDates" };
        }
      }
      return { ok: true };
    case 3:
      return state.campaignMediaIds.length > 0
        ? { ok: true }
        : { ok: false, errorKey: "needMediaPick" };
    default:
      return { ok: true };
  }
}

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
 * 현재 단계에서 다음 단계로 이동 가능한지 여부.
 *
 * 6단계 순서 (브리핑 재배치 반영):
 *   1. 캠페인 목표           — campaignGoal 필수
 *   2. 타깃 · 지역            — regions 최소 1개
 *   3. 예산 · 기간            — budget ≥ MIN
 *   4. 매체 선택(AI 추천)      — campaignMediaIds 최소 1개
 *   5. 로고 업로드 · 합성      — optional (스킵 허용)
 *   6. 보고서                 — 자유 진행
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
      return state.regions.length > 0
        ? { ok: true }
        : { ok: false, errorKey: "selectRegion" };
    case 3:
      return selectBudgetNum(state) >= PLANNER_BUDGET_MIN
        ? { ok: true }
        : { ok: false, errorKey: "needBudget" };
    case 4:
      return state.campaignMediaIds.length > 0
        ? { ok: true }
        : { ok: false, errorKey: "needMediaPick" };
    default:
      return { ok: true };
  }
}

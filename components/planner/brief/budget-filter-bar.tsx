"use client";

import { BUDGET_WITHIN_MIN_HINT } from "@/lib/planner/brief/budget-ranking";

type Props = {
  isKo: boolean;
  budgetWithinOnly: boolean;
  onToggle: (next: boolean) => void;
  hiddenOverBudgetCount: number;
  withinBudgetCount: number;
};

export function BudgetFilterBar({
  isKo,
  budgetWithinOnly,
  onToggle,
  hiddenOverBudgetCount,
  withinBudgetCount,
}: Props) {
  const showLowHint =
    budgetWithinOnly && withinBudgetCount < BUDGET_WITHIN_MIN_HINT;

  return (
    <div className="mb-3 space-y-2 rounded-lg border border-border bg-muted/30 p-2.5">
      <label className="flex cursor-pointer items-center gap-2 text-xs font-medium">
        <input
          type="checkbox"
          checked={budgetWithinOnly}
          onChange={(e) => onToggle(e.target.checked)}
          className="size-3.5 rounded border-border"
        />
        {isKo ? "예산 내만 보기" : "Within budget only"}
      </label>

      {budgetWithinOnly && hiddenOverBudgetCount > 0 ? (
        <p className="tkad-type-caption text-muted-foreground">
          {isKo
            ? `예산 초과 매체 ${hiddenOverBudgetCount}건 숨김`
            : `${hiddenOverBudgetCount} over-budget media hidden`}
        </p>
      ) : null}

      {showLowHint ? (
        <p className="tkad-type-caption leading-relaxed text-amber-800 dark:text-amber-300">
          {isKo
            ? "예산 내 매체가 적습니다. 토글을 끄면 더 많은 매체를 볼 수 있습니다."
            : "Few media fit your budget. Turn off the filter to see more options."}
        </p>
      ) : null}
    </div>
  );
}

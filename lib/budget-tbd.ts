import { PLANNER_BUDGET_MIN } from "@/lib/planner/types";

/** UI 표시용 */
export const BUDGET_TBD_LABEL = {
  ko: "예산 미정",
  en: "Budget TBD",
} as const;

/**
 * budgetTbd 시 매칭·스코어링에 쓰는 보수적 기본값(만원).
 * unlimited(0)와 달리 상한 필터는 유지한다.
 */
export const BUDGET_TBD_MATCHING_FALLBACK_MAN = PLANNER_BUDGET_MIN;

export function isBudgetTbd(tbd?: boolean | null): boolean {
  return tbd === true;
}

export function budgetTbdLabel(isKo: boolean): string {
  return isKo ? BUDGET_TBD_LABEL.ko : BUDGET_TBD_LABEL.en;
}

/** 리포트·카트 등 사용자-facing 예산 문구 */
export function formatBudgetManDisplay(
  man: number,
  isKo: boolean,
  opts?: { tbd?: boolean | null },
): string {
  if (isBudgetTbd(opts?.tbd)) return budgetTbdLabel(isKo);
  if (!(man > 0)) return isKo ? "—" : "—";
  return isKo
    ? `₩${man.toLocaleString()}만`
    : `₩${man.toLocaleString()}M`;
}

/** TBD면 기본값, unlimited(0)와 구분해 양수 fallback 반환 */
export function resolveBudgetManForMatching(
  man: number,
  opts?: { tbd?: boolean | null; unlimited?: boolean | null },
): number {
  if (isBudgetTbd(opts?.tbd)) return BUDGET_TBD_MATCHING_FALLBACK_MAN;
  if (opts?.unlimited && man <= 0) return BUDGET_TBD_MATCHING_FALLBACK_MAN;
  return man > 0 ? man : BUDGET_TBD_MATCHING_FALLBACK_MAN;
}

/**
 * my/plan 보고서 — 「요청 예산」display-only override (admin KPI override 와 동일 개념).
 * 카트 `totalBudget` 은 변경하지 않는다.
 */

const STORAGE_KEY = "tkad_plan_cart_report_request_budget_override_v1";

export type PlanCartReportRequestBudgetOverride = {
  /** 만원 단위 */
  requestedBudgetMan: number;
  /** override 저장 시점 카트 updatedAt — 불일치 시 무시 */
  cartUpdatedAt: string;
};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readPlanCartReportRequestBudgetOverride(
  cartUpdatedAt?: string,
): PlanCartReportRequestBudgetOverride | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlanCartReportRequestBudgetOverride;
    if (
      parsed == null ||
      typeof parsed.requestedBudgetMan !== "number" ||
      !Number.isFinite(parsed.requestedBudgetMan) ||
      parsed.requestedBudgetMan <= 0 ||
      typeof parsed.cartUpdatedAt !== "string"
    ) {
      return null;
    }
    if (cartUpdatedAt && parsed.cartUpdatedAt !== cartUpdatedAt) {
      return null;
    }
    return {
      requestedBudgetMan: Math.round(parsed.requestedBudgetMan),
      cartUpdatedAt: parsed.cartUpdatedAt,
    };
  } catch {
    return null;
  }
}

export function writePlanCartReportRequestBudgetOverride(
  value: PlanCartReportRequestBudgetOverride | null,
): void {
  if (!isBrowser()) return;
  if (value == null) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      requestedBudgetMan: Math.round(value.requestedBudgetMan),
      cartUpdatedAt: value.cartUpdatedAt,
    }),
  );
}

/** override 가 카트 입력 예산과 다를 때 안내 문구 */
export function planCartRequestBudgetOverrideNotice(
  isKo: boolean,
): string {
  return isKo
    ? "※ 요청 예산은 카트 입력값과 다른 표시값입니다 (리포트·PDF 전용)."
    : "※ Requested budget differs from your cart entry (report/PDF display only).";
}

export function resolveEffectiveRequestedBudgetMan(args: {
  cartRequestedBudgetMan?: number;
  budgetMan: number;
  overrideMan?: number | null;
}): number {
  if (args.overrideMan != null && args.overrideMan > 0) {
    return Math.round(args.overrideMan);
  }
  if (args.cartRequestedBudgetMan != null && args.cartRequestedBudgetMan > 0) {
    return Math.round(args.cartRequestedBudgetMan);
  }
  return Math.max(0, Math.round(args.budgetMan));
}

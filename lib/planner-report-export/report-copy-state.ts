/**
 * C-full — 보고서 표지·인사말·요약 편집 상태 (플로우 공용).
 * persist: `useReportCopyStore` (세션) + 플랜 스냅샷 `reportCopy` (저장 시).
 */

export type PlannerReportCopyState = {
  clientName: string;
  documentTitle: string;
  coverLogoUrl: string | null;
  greeting: string;
  executiveSummary: string;
  greetingTouched: boolean;
  executiveSummaryTouched: boolean;
  copyFingerprint: string | null;
  /** C-full-3a — 캠페인 총 제작비 (직접 입력, 3b에서 매체별 합계로 대체 가능) */
  productionCostWon: number | null;
};

export const EMPTY_PLANNER_REPORT_COPY: PlannerReportCopyState = {
  clientName: "",
  documentTitle: "",
  coverLogoUrl: null,
  greeting: "",
  executiveSummary: "",
  greetingTouched: false,
  executiveSummaryTouched: false,
  copyFingerprint: null,
  productionCostWon: null,
};

function clampString(value: unknown, max: number): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function optionalUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 2048) : null;
}

/** DB·planJson·localStorage 에서 읽은 raw → 정규 상태 */
export function parsePlannerReportCopyState(
  raw: unknown,
): PlannerReportCopyState {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...EMPTY_PLANNER_REPORT_COPY };
  }
  const o = raw as Record<string, unknown>;
  return {
    clientName: clampString(o.clientName, 80),
    documentTitle: clampString(o.documentTitle, 120),
    coverLogoUrl: optionalUrl(o.coverLogoUrl),
    greeting: clampString(o.greeting, 2000),
    executiveSummary: clampString(o.executiveSummary, 4000),
    greetingTouched: o.greetingTouched === true,
    executiveSummaryTouched: o.executiveSummaryTouched === true,
    copyFingerprint:
      typeof o.copyFingerprint === "string" ? o.copyFingerprint : null,
    productionCostWon:
      typeof o.productionCostWon === "number" &&
      Number.isFinite(o.productionCostWon) &&
      o.productionCostWon >= 0
        ? Math.round(o.productionCostWon)
        : null,
  };
}

/** 저장용 — 빈 블록은 생략 가능 */
export function serializePlannerReportCopyState(
  state: PlannerReportCopyState,
): PlannerReportCopyState {
  return parsePlannerReportCopyState(state);
}

/** 전환기: creativeUploadedUrl 등 레거시 폴백 */
export function resolveCoverLogoUrl(
  copy: Pick<PlannerReportCopyState, "coverLogoUrl">,
  fallbackUrl?: string | null,
): string | undefined {
  const primary = copy.coverLogoUrl?.trim();
  if (primary) return primary;
  const fallback = fallbackUrl?.trim();
  return fallback || undefined;
}

/** SavedPlannerPlan planJson flat 필드 → v1 블록 */
export function migrateReportCopyFromPlanJson(
  plan: Record<string, unknown>,
): PlannerReportCopyState {
  if (plan.reportCopy && typeof plan.reportCopy === "object") {
    return parsePlannerReportCopyState(plan.reportCopy);
  }
  return parsePlannerReportCopyState({
    clientName: plan.reportClientName,
    documentTitle: plan.reportDocumentTitle,
    coverLogoUrl: plan.creativeUploadedUrl,
    greeting: plan.reportGreeting,
    executiveSummary: plan.reportExecutiveSummary,
    greetingTouched: plan.reportGreetingTouched,
    executiveSummaryTouched: plan.reportExecutiveSummaryTouched,
    copyFingerprint: plan.reportCopyFingerprint,
  });
}

export function isEmptyPlannerReportCopy(
  state: PlannerReportCopyState,
): boolean {
  return (
    !state.clientName.trim() &&
    !state.documentTitle.trim() &&
    !state.coverLogoUrl?.trim() &&
    !state.greeting.trim() &&
    !state.executiveSummary.trim() &&
    !state.greetingTouched &&
    !state.executiveSummaryTouched &&
    !state.copyFingerprint &&
    (state.productionCostWon == null || state.productionCostWon <= 0)
  );
}

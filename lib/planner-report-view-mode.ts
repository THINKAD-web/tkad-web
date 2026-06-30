/** 플래너 보고서 Step 6 — 매체 구성 화면 전용 뷰모드 (PDF/PPT 미반영) */

export const PLANNER_REPORT_VIEW_MODE_KEY = "tkad_planner_report_view_mode";

export type PlannerReportViewMode = "detail" | "feed" | "card" | "compact";

const MODES: PlannerReportViewMode[] = ["detail", "feed", "card", "compact"];

export function isPlannerReportViewMode(v: string): v is PlannerReportViewMode {
  return (MODES as string[]).includes(v);
}

export function readPlannerReportViewMode(): PlannerReportViewMode {
  if (typeof window === "undefined") return "detail";
  try {
    const stored = localStorage.getItem(PLANNER_REPORT_VIEW_MODE_KEY);
    if (stored && isPlannerReportViewMode(stored)) return stored;
  } catch {
    /* ignore */
  }
  return "detail";
}

export function writePlannerReportViewMode(mode: PlannerReportViewMode): void {
  try {
    localStorage.setItem(PLANNER_REPORT_VIEW_MODE_KEY, mode);
  } catch {
    /* ignore */
  }
}

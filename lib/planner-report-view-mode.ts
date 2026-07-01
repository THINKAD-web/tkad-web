/** 플래너 보고서 Step 6 — 매체 구성 화면·PDF/PPT 뷰모드 (feed 는 export 시 detail 폴백) */

export const PLANNER_REPORT_VIEW_MODE_KEY = "tkad_planner_report_view_mode";

export type PlannerReportViewMode = "detail" | "feed" | "card" | "compact";

/** PDF/PPT export body — 화면 feed 는 detail 로 폴백 */
export type PlannerExportLineupViewMode = "detail" | "card" | "compact";

const MODES: PlannerReportViewMode[] = ["detail", "feed", "card", "compact"];

const EXPORT_LINEUP_MODES: PlannerExportLineupViewMode[] = [
  "detail",
  "card",
  "compact",
];

export function isPlannerExportLineupViewMode(
  v: string,
): v is PlannerExportLineupViewMode {
  return (EXPORT_LINEUP_MODES as string[]).includes(v);
}

/** 화면 뷰모드 → export 허용 모드 (feed → detail) */
export function lineupViewModeForExport(
  screenMode: PlannerReportViewMode,
): PlannerExportLineupViewMode {
  if (screenMode === "card" || screenMode === "compact") return screenMode;
  return "detail";
}

export function parseExportLineupViewMode(
  raw: unknown,
): PlannerExportLineupViewMode {
  if (typeof raw === "string" && isPlannerExportLineupViewMode(raw)) return raw;
  return "detail";
}

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

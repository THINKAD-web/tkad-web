import { requireReportAccess } from "@/lib/require-report-access";

export type { ReportAccessGateResult } from "@/lib/require-report-access";

/** 견적서·제안서·플래너 보고서 PDF/PPT — `planner_pdf` (LITE+) */
export async function requirePlannerPdfAccess() {
  return requireReportAccess("planner_pdf");
}

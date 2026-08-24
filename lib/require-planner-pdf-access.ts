import { requireReportAccess } from "@/lib/require-report-access";
import { accessDeniedErrorMessage } from "@/lib/entitlements/tier-copy";

export type { ReportAccessGateResult } from "@/lib/require-report-access";

/** 견적서·제안서·플래너 보고서 PDF/PPT — `planner_pdf` (LITE+) */
export async function requirePlannerPdfAccess() {
  return requireReportAccess("planner_pdf");
}

export function plannerPdfAccessDeniedMessage(status: 401 | 403): string {
  return accessDeniedErrorMessage("planner_pdf", status);
}

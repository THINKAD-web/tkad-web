import type { PlannerReportStyle } from "@/lib/planner-report-export/document-theme";
import type { PlannerReportExportFormat } from "@/lib/planner-report-export/types";

export function campaignBuilderExportHref(
  reportId: string,
  format: PlannerReportExportFormat,
  style: PlannerReportStyle,
): string {
  const params = new URLSearchParams({ format, style });
  return `/api/admin/campaign-builder/reports/${encodeURIComponent(reportId)}/export?${params.toString()}`;
}

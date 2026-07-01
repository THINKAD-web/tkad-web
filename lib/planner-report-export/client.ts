"use client";

import {
  plannerReportFileBase,
  type PlannerExportMapPin,
  type PlannerReportExportFormat,
  type PlannerReportExportPayload,
} from "@/lib/planner-report-export/types";
import type { PlanReportActivitySource } from "@/lib/plan-report-activity/types";
import type { PlannerReportSectionVisibility } from "@/lib/planner-report-export/section-visibility";
import type { PlannerExportLineupViewMode } from "@/lib/planner-report-view-mode";

/**
 * 서버에 보고서 payload 를 보내 PDF/PPTX 바이너리를 받아 다운로드한다.
 * (클라이언트 html2canvas 캡처 대체)
 */
export async function downloadPlannerReport(
  format: PlannerReportExportFormat,
  payload: PlannerReportExportPayload,
  options?: {
    activitySource?: PlanReportActivitySource;
    exportMapPins?: PlannerExportMapPin[];
    sectionVisibility?: PlannerReportSectionVisibility;
    lineupViewMode?: PlannerExportLineupViewMode;
  },
): Promise<void> {
  const res = await fetch("/api/planner/report/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({
      format,
      payload,
      activitySource: options?.activitySource,
      exportMapPins: options?.exportMapPins,
      sectionVisibility: options?.sectionVisibility,
      lineupViewMode: options?.lineupViewMode,
    }),
  });
  if (!res.ok) {
    let message = "";
    try {
      const j = (await res.json()) as { error?: string; detail?: string };
      message = j.detail?.trim() || j.error?.trim() || "";
    } catch {
      /* ignore */
    }
    throw new Error(
      message || `export ${format} failed (${res.status})`,
    );
  }
  const contentType = res.headers.get("content-type") ?? "";
  const expectPdf = format === "pdf";
  const expectPptx = format === "pptx";
  if (expectPdf && !contentType.includes("application/pdf")) {
    throw new Error("Invalid PDF response from server.");
  }
  if (expectPptx && !contentType.includes("presentationml")) {
    throw new Error("Invalid PPTX response from server.");
  }
  const blob = await res.blob();
  const name = `${plannerReportFileBase(payload)}.${format}`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

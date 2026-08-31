"use client";

import {
  plannerReportFileBase,
  type PlannerReportExportFormat,
  type PlannerReportExportPayload,
} from "@/lib/planner-report-export/types";
import type { PlanReportActivitySource } from "@/lib/plan-report-activity/types";
import type { PlannerReportSectionVisibility } from "@/lib/planner-report-export/section-visibility";
import type { PlannerExportLineupViewMode } from "@/lib/planner-report-view-mode";
import type { PlannerReportStyle } from "@/lib/planner-report-export/document-theme";

/**
 * 서버에 보고서 payload 를 보내 PDF/PPTX 바이너리를 받아 다운로드한다.
 * (클라이언트 html2canvas 캡처 대체)
 */
export async function downloadPlannerReport(
  format: PlannerReportExportFormat,
  payload: PlannerReportExportPayload,
  options?: {
    activitySource?: PlanReportActivitySource;
    sectionVisibility?: PlannerReportSectionVisibility;
    lineupViewMode?: PlannerExportLineupViewMode;
    style?: PlannerReportStyle;
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
      sectionVisibility: options?.sectionVisibility,
      lineupViewMode: options?.lineupViewMode,
      style: options?.style,
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

/** 서버에서 PDF 생성 후 이메일 발송 (발송 시점 최신 payload 반영) */
export async function sendPlannerReportEmail(
  recipientEmail: string,
  payload: PlannerReportExportPayload,
  options?: {
    activitySource?: PlanReportActivitySource;
    sectionVisibility?: PlannerReportSectionVisibility;
    lineupViewMode?: PlannerExportLineupViewMode;
    emailBody?: string;
  },
): Promise<{ pdfFilename: string; pdfSizeBytes: number }> {
  const res = await fetch("/api/planner/email-report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({
      recipientEmail,
      payload,
      activitySource: options?.activitySource,
      sectionVisibility: options?.sectionVisibility,
      lineupViewMode: options?.lineupViewMode,
      emailBody: options?.emailBody,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    detail?: string;
    pdfFilename?: string;
    pdfSizeBytes?: number;
  };
  if (!res.ok) {
    const message = data.detail?.trim() || data.error?.trim() || "";
    throw new Error(message || `email send failed (${res.status})`);
  }
  return {
    pdfFilename: data.pdfFilename ?? `${plannerReportFileBase(payload)}.pdf`,
    pdfSizeBytes: data.pdfSizeBytes ?? 0,
  };
}

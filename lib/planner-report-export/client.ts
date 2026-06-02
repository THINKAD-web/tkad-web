"use client";

import {
  plannerReportFileBase,
  type PlannerReportExportFormat,
  type PlannerReportExportPayload,
} from "@/lib/planner-report-export/types";

/**
 * 서버에 보고서 payload 를 보내 PDF/PPTX 바이너리를 받아 다운로드한다.
 * (클라이언트 html2canvas 캡처 대체)
 */
export async function downloadPlannerReport(
  format: PlannerReportExportFormat,
  payload: PlannerReportExportPayload,
): Promise<void> {
  const res = await fetch("/api/planner/report/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ format, payload }),
  });
  if (!res.ok) {
    let detail = "";
    try {
      detail = ((await res.json()) as { detail?: string }).detail ?? "";
    } catch {
      /* ignore */
    }
    throw new Error(`export ${format} failed (${res.status})${detail ? `: ${detail}` : ""}`);
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

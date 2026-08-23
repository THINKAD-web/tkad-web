export const PLAN_REPORT_ACTIVITY_EVENTS = [
  "view",
  "pdf_export",
  "pptx_export",
  "email_send",
] as const;
export type PlanReportActivityEvent =
  (typeof PLAN_REPORT_ACTIVITY_EVENTS)[number];

export const PLAN_REPORT_ACTIVITY_SOURCES = [
  "plan_cart_report",
  "planner",
  "integrated_planner",
  "ai_recommend",
] as const;
export type PlanReportActivitySource =
  (typeof PLAN_REPORT_ACTIVITY_SOURCES)[number];

export type PlanReportActivityInput = {
  eventType: PlanReportActivityEvent;
  source: PlanReportActivitySource;
  format?: "pdf" | "pptx";
  mediaCount?: number;
  goalTitle?: string | null;
  regionsText?: string | null;
  reportTitle?: string | null;
  recipientEmail?: string | null;
};

export type AdminPlanReportActivityRow = {
  id: string;
  eventType: PlanReportActivityEvent;
  source: PlanReportActivitySource;
  format: string | null;
  mediaCount: number;
  goalTitle: string | null;
  regionsText: string | null;
  reportTitle: string | null;
  recipientEmail: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    company: string | null;
  };
};

export function eventTypeLabelKo(
  event: PlanReportActivityEvent,
): string {
  switch (event) {
    case "view":
      return "보고서 조회";
    case "pdf_export":
      return "PDF 다운로드";
    case "pptx_export":
      return "PPT 다운로드";
    case "email_send":
      return "이메일 발송";
  }
}

export function sourceLabelKo(source: PlanReportActivitySource): string {
  switch (source) {
    case "plan_cart_report":
      return "내 플랜 보고서";
    case "planner":
      return "플래너";
    case "integrated_planner":
      return "통합 플래너";
    case "ai_recommend":
      return "AI 추천";
  }
}

export function resolveSourceFromExportPayload(payload: {
  kind?: string;
  portfolioGroups?: unknown[];
}): PlanReportActivitySource {
  if (payload.portfolioGroups && payload.portfolioGroups.length > 0) {
    return "plan_cart_report";
  }
  if (payload.kind === "integrated") return "integrated_planner";
  return "planner";
}

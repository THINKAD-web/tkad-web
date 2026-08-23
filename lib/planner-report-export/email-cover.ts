import { CONTACT_EMAIL, CONTACT_MAILTO } from "@/lib/constants";
import type { PlannerReportExportPayload } from "@/lib/planner-report-export/types";
import { plannerReportFileBase } from "@/lib/planner-report-export/types";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function reportDisplayTitle(payload: PlannerReportExportPayload): string {
  return (
    payload.documentTitle?.trim() ||
    payload.campaignName?.trim() ||
    payload.goalTitle?.trim() ||
    (payload.isKo ? "미디어 제안서" : "Media proposal")
  );
}

/** 발송 확인·API 공용 — 커버 메일 초안 (PDF 본문 아님) */
export function buildDefaultPlannerReportEmailBody(
  payload: PlannerReportExportPayload,
): string {
  const title = reportDisplayTitle(payload);
  const client = payload.clientName?.trim();

  if (payload.isKo) {
    if (client) {
      return `${client} 담당자님,\n\n안녕하세요. THINKAD 미디어 플래너입니다.\n\n「${title}」 미디어 제안서를 첨부드립니다. 검토 후 회신 부탁드립니다.\n\n감사합니다.`;
    }
    return `안녕하세요. THINKAD 미디어 플래너입니다.\n\n「${title}」 미디어 제안서를 첨부드립니다. 검토 후 회신 부탁드립니다.\n\n감사합니다.`;
  }

  if (client) {
    return `Dear ${client},\n\nPlease find attached the media proposal for "${title}".\n\nWe look forward to your feedback.\n\nBest regards,\nTHINKAD Media Planner`;
  }
  return `Hello,\n\nPlease find attached the media proposal for "${title}".\n\nWe look forward to your feedback.\n\nBest regards,\nTHINKAD Media Planner`;
}

export function buildPlannerReportEmailSubject(
  payload: PlannerReportExportPayload,
): string {
  const title = reportDisplayTitle(payload);
  return payload.isKo
    ? `[THINKAD] 미디어 제안서 - ${title}`
    : `[THINKAD] Media proposal - ${title}`;
}

export function buildPlannerReportEmailCover(args: {
  payload: PlannerReportExportPayload;
  bodyText?: string;
}): { subject: string; html: string; text: string; pdfFilename: string } {
  const { payload } = args;
  const text = args.bodyText?.trim() || buildDefaultPlannerReportEmailBody(payload);
  const subject = buildPlannerReportEmailSubject(payload);
  const pdfFilename = `${plannerReportFileBase(payload)}.pdf`;
  const attachmentNote = payload.isKo
    ? `첨부: ${pdfFilename}`
    : `Attachment: ${pdfFilename}`;
  const contactLine = payload.isKo
    ? `문의: <a href="${CONTACT_MAILTO}" style="color:#b45309;font-weight:600;text-decoration:none;">${CONTACT_EMAIL}</a>`
    : `Contact: <a href="${CONTACT_MAILTO}" style="color:#b45309;font-weight:600;text-decoration:none;">${CONTACT_EMAIL}</a>`;

  const htmlBody = escapeHtml(text).replace(/\n/g, "<br />");

  const html = `
    <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:640px;margin:0 auto;color:#0f172a;">
      <div style="padding:20px 0 8px;font-size:15px;line-height:1.65;">${htmlBody}</div>
      <p style="margin:20px 0 0;padding:12px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;font-size:13px;color:#475569;">
        ${escapeHtml(attachmentNote)}
      </p>
      <p style="margin:16px 0 0;font-size:12px;color:#64748b;">${contactLine}</p>
      <p style="margin:20px 0 0;font-size:11px;color:#94a3b8;text-align:center;">
        ${payload.isKo ? "본 메일은 THINKAD 미디어 플래너에서 발송되었습니다." : "Sent from THINKAD Media Planner."}
      </p>
    </div>
  `.trim();

  return {
    subject,
    html,
    text: `${text}\n\n${attachmentNote}`,
    pdfFilename,
  };
}

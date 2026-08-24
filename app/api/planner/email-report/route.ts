import { NextRequest, NextResponse } from "next/server";
import { CONTACT_EMAIL } from "@/lib/constants";
import { isEmailConfigured, sendEmailWithPdfResult, sendEmailWithResult } from "@/lib/email/client";
import { logPlanReportActivityFireAndForget } from "@/lib/plan-report-activity/log";
import {
  PLAN_REPORT_ACTIVITY_SOURCES,
  resolveSourceFromExportPayload,
  type PlanReportActivitySource,
} from "@/lib/plan-report-activity/types";
import { buildPlannerReportEmailCover } from "@/lib/planner-report-export/email-cover";
import { parseSectionVisibility } from "@/lib/planner-report-export/section-visibility";
import { parseExportLineupViewMode } from "@/lib/planner-report-view-mode";
import {
  isPlannerReportExportPayload,
  type PlannerReportExportPayload,
} from "@/lib/planner-report-export/types";
import { requirePlannerPdfAccess, plannerPdfAccessDeniedMessage } from "@/lib/require-planner-pdf-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type EmailReportBody = {
  recipientEmail?: string;
  /** @deprecated use recipientEmail */
  userEmail?: string;
  emailBody?: string;
  payload?: unknown;
  activitySource?: PlanReportActivitySource;
  sectionVisibility?: unknown;
  lineupViewMode?: unknown;
};

function resolveRecipientEmail(body: EmailReportBody): string | null {
  const raw = (body.recipientEmail ?? body.userEmail ?? "").trim();
  if (!raw || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) return null;
  return raw;
}

/**
 * 플래너 제안서 이메일 발송 — 발송 시점에 서버 PDF 생성 후 첨부.
 */
export async function POST(request: NextRequest) {
  if (!isEmailConfigured()) {
    return NextResponse.json(
      { error: "Email not configured" },
      { status: 503 },
    );
  }

  const pdfAccess = await requirePlannerPdfAccess();
  if (!pdfAccess.allowed) {
    return NextResponse.json(
      {
        error: plannerPdfAccessDeniedMessage(pdfAccess.status),
      },
      { status: pdfAccess.status },
    );
  }

  let body: EmailReportBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const recipientEmail = resolveRecipientEmail(body);
  if (!recipientEmail) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  if (!isPlannerReportExportPayload(body.payload)) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const payload = body.payload as PlannerReportExportPayload;
  const sectionVisibility = parseSectionVisibility(body.sectionVisibility);
  const lineupViewMode = parseExportLineupViewMode(body.lineupViewMode);
  const exportAssets = { sectionVisibility, lineupViewMode };

  const cover = buildPlannerReportEmailCover({
    payload,
    bodyText: body.emailBody,
  });

  let pdfBytes: Uint8Array;
  try {
    const { buildPlannerReportPdf } = await import(
      "@/lib/planner-report-export/build-pdf"
    );
    pdfBytes = await buildPlannerReportPdf(payload, exportAssets);
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error("[planner email] PDF generation failed", {
      message: err.message,
      stack: err.stack,
    });
    return NextResponse.json(
      {
        error: "Failed to generate PDF.",
        detail: process.env.NODE_ENV === "development" ? err.message : undefined,
      },
      { status: 500 },
    );
  }

  const pdfBase64 = Buffer.from(pdfBytes).toString("base64");
  const pdfSizeBytes = pdfBytes.byteLength;

  try {
    const userResult = await sendEmailWithPdfResult({
      to: recipientEmail,
      subject: cover.subject,
      text: cover.text,
      html: cover.html,
      pdfFilename: cover.pdfFilename,
      pdfBase64,
    });
    if (!userResult.sent) {
      return NextResponse.json(
        { error: userResult.error ?? "Failed to send email" },
        { status: 500 },
      );
    }

    const adminResult = await sendEmailWithResult({
      to: CONTACT_EMAIL,
      subject: `[플래너 제안서 발송] ${recipientEmail} - ${cover.subject}`,
      text: `${recipientEmail}에게 제안서 PDF를 발송했습니다.\n첨부: ${cover.pdfFilename} (${pdfSizeBytes} bytes)`,
      html: `<p><strong>${recipientEmail}</strong>에게 제안서 PDF를 발송했습니다.</p><p>첨부: ${cover.pdfFilename} (${pdfSizeBytes.toLocaleString()} bytes)</p>`,
      attachments: [
        {
          filename: cover.pdfFilename,
          content: pdfBase64,
          encoding: "base64",
        },
      ],
    });
    if (!adminResult.sent) {
      console.error("[planner email] admin copy failed:", adminResult.error);
    }

    const userId = pdfAccess.userId;
    if (userId) {
      const source =
        body.activitySource &&
        (PLAN_REPORT_ACTIVITY_SOURCES as readonly string[]).includes(
          body.activitySource,
        )
          ? body.activitySource
          : resolveSourceFromExportPayload(payload);
      logPlanReportActivityFireAndForget(userId, {
        eventType: "email_send",
        source,
        format: "pdf",
        mediaCount: payload.portfolio?.length ?? 0,
        goalTitle: payload.goalTitle,
        regionsText: payload.regionsText,
        reportTitle: payload.documentTitle || payload.campaignName,
        recipientEmail,
      });
    }

    return NextResponse.json({
      success: true,
      pdfFilename: cover.pdfFilename,
      pdfSizeBytes,
    });
  } catch (e) {
    console.error("[planner email]", e);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 },
    );
  }
}

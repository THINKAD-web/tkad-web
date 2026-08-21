import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { isEmailConfigured, sendEmailWithPdfAttachment } from "@/lib/email/client";
import { buildPlannerReportPdf } from "@/lib/planner-report-export/build-pdf";
import { plannerReportFileBase } from "@/lib/planner-report-export/types";
import { assertInquiryAutoProposalTestRecipient } from "@/lib/inquiry-auto-proposal/test-send-allowlist";
import { SELLING_UNIT_FOLLOWUP_LINE_KO } from "@/lib/inquiry-auto-proposal/candidate-filter";
import { buildInquiryAutoProposalForOption } from "@/lib/inquiry-auto-proposal/run-dry-run";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  if (!isEmailConfigured()) {
    return json({ error: "email_not_configured" }, 503);
  }

  let body: { text?: unknown; optionId?: unknown; to?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const text = typeof body.text === "string" ? body.text : "";
  const optionId = typeof body.optionId === "string" ? body.optionId : "";
  const toRaw = typeof body.to === "string" ? body.to : "";
  if (text.trim().length < 4 || !optionId) {
    return json({ error: "text_and_option_required" }, 400);
  }

  const allow = assertInquiryAutoProposalTestRecipient(toRaw);
  if (!allow.ok) {
    return json({ error: allow.error }, 400);
  }

  try {
    const { option, payload } = await buildInquiryAutoProposalForOption({
      text,
      optionId,
    });
    const pdf = await buildPlannerReportPdf(payload);
    const pdfBase64 = Buffer.from(pdf).toString("base64");
    const filename = `${plannerReportFileBase(payload)}.pdf`;
    const followUp = option.sellingUnitFollowUp
      ? `\n\n${SELLING_UNIT_FOLLOWUP_LINE_KO}`
      : "";

    await sendEmailWithPdfAttachment({
      to: allow.normalized,
      subject: "[THINKAD] 문의 자동 매칭 제안 (테스트 발송)",
      text: `테스트 주소 전용 발송입니다. 고객 주소로는 나가지 않습니다.\n\n옵션: ${option.names.join(" + ")}\n월 합계 ₩${option.monthlyWon.toLocaleString("ko-KR")}${followUp}`,
      html: `<p>테스트 주소 전용 발송입니다. 고객 주소로는 나가지 않습니다.</p><p>옵션: <strong>${option.names.join(" + ")}</strong></p><p>월 합계 ₩${option.monthlyWon.toLocaleString("ko-KR")}</p>${
        option.sellingUnitFollowUp
          ? `<p>${SELLING_UNIT_FOLLOWUP_LINE_KO}</p>`
          : ""
      }`,
      pdfFilename: filename,
      pdfBase64,
    });

    return json({
      ok: true,
      to: allow.normalized,
      optionId: option.optionId,
      names: option.names,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "send_failed";
    if (message.startsWith("PROPOSAL_")) {
      return json({ error: message }, 400);
    }
    console.error("[inquiry-auto-proposal/send]", e);
    return json({ error: "send_failed" }, 500);
  }
}

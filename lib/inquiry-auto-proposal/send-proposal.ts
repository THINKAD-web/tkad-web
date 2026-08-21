import { buildPlannerReportPdf } from "@/lib/planner-report-export/build-pdf";
import { plannerReportFileBase } from "@/lib/planner-report-export/types";
import type { PlannerReportExportPayload } from "@/lib/planner-report-export/types";
import { SELLING_UNIT_FOLLOWUP_LINE_KO } from "./candidate-filter";
import { buildInquiryAutoProposalForOption } from "./run-dry-run";
import { assertInquiryAutoProposalTestRecipient } from "./test-send-allowlist";

export type InquiryAutoProposalSendEmailArgs = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  pdfFilename: string;
  pdfBase64: string;
};

export type InquiryAutoProposalSendDeps = {
  isEmailConfigured: () => boolean;
  sendEmailWithPdfAttachment: (
    args: InquiryAutoProposalSendEmailArgs,
  ) => Promise<void>;
  buildForOption?: typeof buildInquiryAutoProposalForOption;
  buildPdf?: (payload: PlannerReportExportPayload) => Promise<Uint8Array>;
};

export type InquiryAutoProposalSendResult =
  | { ok: true; to: string; optionId: string; names: string[] }
  | { ok: false; error: string; httpStatus: number };

/**
 * To allowlist runs before catalog/PDF/email.
 * Customer domains never reach sendEmailWithPdfAttachment.
 */
export async function dispatchInquiryAutoProposalSend(
  input: { text: string; optionId: string; to: string },
  deps: InquiryAutoProposalSendDeps,
): Promise<InquiryAutoProposalSendResult> {
  const allow = assertInquiryAutoProposalTestRecipient(input.to);
  if (!allow.ok) {
    return { ok: false, error: allow.error, httpStatus: 400 };
  }

  const text = input.text.trim();
  if (text.length < 4 || !input.optionId) {
    return { ok: false, error: "text_and_option_required", httpStatus: 400 };
  }

  if (!deps.isEmailConfigured()) {
    return { ok: false, error: "email_not_configured", httpStatus: 503 };
  }

  const buildForOption = deps.buildForOption ?? buildInquiryAutoProposalForOption;
  const buildPdf = deps.buildPdf ?? buildPlannerReportPdf;

  try {
    const { option, payload } = await buildForOption({
      text,
      optionId: input.optionId,
    });
    const pdf = await buildPdf(payload);
    const pdfBase64 = Buffer.from(pdf).toString("base64");
    const filename = `${plannerReportFileBase(payload)}.pdf`;
    const followUp = option.sellingUnitFollowUp
      ? `\n\n${SELLING_UNIT_FOLLOWUP_LINE_KO}`
      : "";

    await deps.sendEmailWithPdfAttachment({
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

    return {
      ok: true,
      to: allow.normalized,
      optionId: option.optionId,
      names: option.names,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "send_failed";
    if (message.startsWith("PROPOSAL_")) {
      return { ok: false, error: message, httpStatus: 400 };
    }
    throw e;
  }
}

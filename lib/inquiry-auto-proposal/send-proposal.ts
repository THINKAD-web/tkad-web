import { buildPlannerReportPdf } from "@/lib/planner-report-export/build-pdf";
import { plannerReportFileBase } from "@/lib/planner-report-export/types";
import type { PlannerReportExportPayload } from "@/lib/planner-report-export/types";
import { SELLING_UNIT_FOLLOWUP_LINE_KO } from "./candidate-filter";
import { buildInquiryAutoProposal } from "./run-dry-run";
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
  buildProposal?: typeof buildInquiryAutoProposal;
  buildPdf?: (payload: PlannerReportExportPayload) => Promise<Uint8Array>;
};

export type InquiryAutoProposalSendResult =
  | { ok: true; to: string; names: string[] }
  | { ok: false; error: string; httpStatus: number };

/**
 * To allowlist runs before catalog/PDF/email.
 * Customer domains never reach sendEmailWithPdfAttachment.
 */
export async function dispatchInquiryAutoProposalSend(
  input: { text: string; to: string },
  deps: InquiryAutoProposalSendDeps,
): Promise<InquiryAutoProposalSendResult> {
  const allow = assertInquiryAutoProposalTestRecipient(input.to);
  if (!allow.ok) {
    return { ok: false, error: allow.error, httpStatus: 400 };
  }

  const text = input.text.trim();
  if (text.length < 4) {
    return { ok: false, error: "text_required", httpStatus: 400 };
  }

  if (!deps.isEmailConfigured()) {
    return { ok: false, error: "email_not_configured", httpStatus: 503 };
  }

  const buildProposal = deps.buildProposal ?? buildInquiryAutoProposal;
  const buildPdf = deps.buildPdf ?? buildPlannerReportPdf;

  try {
    const { dryRun, payload } = await buildProposal({ text });
    const names = dryRun.eligible.map((m) => m.name);
    const pdf = await buildPdf(payload);
    const pdfBase64 = Buffer.from(pdf).toString("base64");
    const filename = `${plannerReportFileBase(payload)}.pdf`;
    const followUp = dryRun.eligible.some((m) => m.sellingUnitUndeclared)
      ? `\n\n${SELLING_UNIT_FOLLOWUP_LINE_KO}`
      : "";

    await deps.sendEmailWithPdfAttachment({
      to: allow.normalized,
      subject: "[THINKAD] 문의 자동 매칭 제안 (테스트 발송)",
      text: `테스트 주소 전용 발송입니다. 고객 주소로는 나가지 않습니다.\n\n믹스: ${names.join(" + ")}${followUp}`,
      html: `<p>테스트 주소 전용 발송입니다. 고객 주소로는 나가지 않습니다.</p><p>믹스: <strong>${names.join(" + ")}</strong></p>${
        dryRun.eligible.some((m) => m.sellingUnitUndeclared)
          ? `<p>${SELLING_UNIT_FOLLOWUP_LINE_KO}</p>`
          : ""
      }`,
      pdfFilename: filename,
      pdfBase64,
    });

    return {
      ok: true,
      to: allow.normalized,
      names,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "send_failed";
    if (message.startsWith("PROPOSAL_")) {
      return { ok: false, error: message, httpStatus: 400 };
    }
    throw e;
  }
}

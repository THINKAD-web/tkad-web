import {
  isEmailConfigured,
  sendEmailWithPdfAttachment,
} from "@/lib/email/client";
import {
  auditLogToSummary,
  buildContractSignAuditEmail,
  type SignatureAuditSummary,
} from "@/lib/signature-audit";
import type { SignatureAuditLog } from "@prisma/client";

function resolveCompanyContractEmails(): string[] {
  const raw = [
    process.env.OOH_CONTRACT_ALERT_EMAIL?.trim(),
    process.env.CONTACT_ALERT_EMAIL?.trim(),
    process.env.QUOTE_ISSUER_EMAIL?.trim(),
  ].filter(Boolean) as string[];
  return [...new Set(raw)];
}

/** 서명 완료 증거 이메일 — 광고주(서명자) + 싱커드(운영) 양측 발송 */
export async function sendContractSignedEvidenceEmails(input: {
  isKo: boolean;
  signerEmail: string;
  signerName: string;
  auditLog: SignatureAuditLog;
  signedPdfSha256: string;
  pdfBase64: string;
}): Promise<{ sentToSigner: boolean; sentToCompany: number }> {
  if (!isEmailConfigured()) {
    return { sentToSigner: false, sentToCompany: 0 };
  }

  const summary: SignatureAuditSummary = auditLogToSummary(input.auditLog, {
    signerName: input.signerName,
    signedPdfSha256: input.signedPdfSha256,
  });
  const mail = buildContractSignAuditEmail({ isKo: input.isKo, summary });
  const pdfFilename = `thinkad-contract-${input.auditLog.contractId.slice(0, 8)}-signed.pdf`;

  let sentToSigner = false;
  try {
    await sendEmailWithPdfAttachment({
      to: input.signerEmail,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      pdfFilename,
      pdfBase64: input.pdfBase64,
    });
    sentToSigner = true;
  } catch (e) {
    console.error("[contract-sign-notify] signer email", e);
  }

  let sentToCompany = 0;
  for (const to of resolveCompanyContractEmails()) {
    try {
      await sendEmailWithPdfAttachment({
        to,
        subject: input.isKo
          ? `[싱커드·내부] 계약 서명 완료 ${input.signerName}`
          : `[THINKAD·ops] Contract signed ${input.signerName}`,
        text: mail.text,
        html: mail.html,
        pdfFilename: `contract-signed-${input.auditLog.contractId.slice(0, 8)}.pdf`,
        pdfBase64: input.pdfBase64,
      });
      sentToCompany += 1;
    } catch (e) {
      console.error("[contract-sign-notify] company email", to, e);
    }
  }

  return { sentToSigner, sentToCompany };
}

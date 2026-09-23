import { isEmailConfigured, sendEmailWithResult } from "@/lib/email/client";

/** Mode B — 계약 PDF 첨부 발송 (서명 링크 없음) */
export async function sendContractAttachmentEmail(input: {
  to: string;
  clientName: string;
  locale: "ko" | "en";
  pdfBuffer: Buffer;
  fileName: string;
}): Promise<boolean> {
  const to = input.to.trim();
  if (!to || !isEmailConfigured()) return false;

  const isKo = input.locale !== "en";
  const safeName =
    input.fileName.replace(/[^\w.\-()가-힣\s]/g, "_").slice(0, 120) ||
    "contract.pdf";
  const filename = safeName.toLowerCase().endsWith(".pdf")
    ? safeName
    : `${safeName}.pdf`;

  try {
    const sent = await sendEmailWithResult({
      to,
      subject: isKo
        ? "[싱커드] 계약서를 확인해 주세요"
        : "[THINKAD] Please review the attached contract",
      text: isKo
        ? `안녕하세요 ${input.clientName}님,\n\n첨부된 계약서 PDF를 확인해 주세요. 문의 사항은 담당자에게 연락해 주시기 바랍니다.\n\n감사합니다.`
        : `Hello ${input.clientName},\n\nPlease find your contract PDF attached. Contact us if you have any questions.\n\nThank you.`,
      html: isKo
        ? `<p>안녕하세요 <strong>${input.clientName}</strong>님,</p><p>첨부된 계약서 PDF를 확인해 주세요.</p>`
        : `<p>Hello <strong>${input.clientName}</strong>,</p><p>Please review the attached contract PDF.</p>`,
      attachments: [
        {
          filename,
          content: input.pdfBuffer.toString("base64"),
          encoding: "base64",
        },
      ],
    });
    if (!sent.sent) {
      console.error("[contract-attachment-email] provider rejected:", sent.error);
    }
    return sent.sent;
  } catch (e) {
    console.error("[contract-attachment-email]", e);
    return false;
  }
}

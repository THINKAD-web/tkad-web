import { NextRequest } from "next/server";
import { OoHQuoteStatus, OohContractStatus } from "@prisma/client";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
import { canAdminSendInvoice } from "@/lib/ooh-quote";
import { buildSimpleContractPdfBase64 } from "@/lib/server-ooh-quote-pdf";
import { sendEmailWithPdfAttachment } from "@/lib/email/client";

export const dynamic = "force-dynamic";

function bankLines(isKo: boolean): string[] {
  const name = process.env.QUOTE_BANK_NAME?.trim();
  const account = process.env.QUOTE_BANK_ACCOUNT?.trim();
  const holder = process.env.QUOTE_BANK_HOLDER?.trim();
  if (isKo) {
    return [
      name ? `입금 계좌: ${name}` : "입금 계좌: (관리자 설정 QUOTE_BANK_*)",
      account ? `계좌번호: ${account}` : "",
      holder ? `예금주: ${holder}` : "",
    ].filter(Boolean);
  }
  return [
    name ? `Bank: ${name}` : "Bank: (configure QUOTE_BANK_*)",
    account ? `Account: ${account}` : "",
    holder ? `Holder: ${holder}` : "",
  ].filter(Boolean);
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const { id } = await ctx.params;
  const db = getPrisma();
  const row = await db.ooHQuote.findUnique({
    where: { id },
    include: { oohContract: true },
  });
  if (!row) return json({ error: "Not found" }, 404);
  if (!canAdminSendInvoice(row.status)) {
    return json({ error: "Invalid status for this action" }, 409);
  }
  if (
    !row.oohContract ||
    row.oohContract.status !== OohContractStatus.signed
  ) {
    return json(
      { error: "전자계약 서명 완료 후 청구서를 발송할 수 있습니다." },
      409,
    );
  }

  const to = row.clientEmail?.trim();
  if (!to) {
    return json({ error: "Customer email missing" }, 400);
  }

  const isKo = row.locale !== "en";
  const due = new Date();
  due.setDate(due.getDate() + 7);
  const dueStr = due.toISOString().slice(0, 10);

  const contractLines = [
    isKo ? "OOH 광고 계약서 (요약)" : "OOH advertising contract (summary)",
    "",
    isKo ? `의뢰인: ${row.clientName}` : `Client: ${row.clientName}`,
    row.clientCompany
      ? isKo
        ? `회사: ${row.clientCompany}`
        : `Company: ${row.clientCompany}`
      : "",
    isKo ? `광고 기간: ${row.period}` : `Period: ${row.period}`,
    isKo
      ? `총 집행 금액(참고, 만원): ₩${row.totalAmount.toLocaleString("ko-KR")}`
      : `Total (10K KRW units): ₩${row.totalAmount.toLocaleString("en-US")}`,
    "",
    isKo
      ? "본 문서는 전자요약이며, 정식 계약은 별도 서면을 따릅니다."
      : "This is a summary; formal terms follow a separate agreement.",
  ].filter(Boolean) as string[];

  const invoiceLines = [
    isKo ? "청구서" : "Invoice",
    "",
    isKo ? `청구일: ${new Date().toISOString().slice(0, 10)}` : `Date: ${new Date().toISOString().slice(0, 10)}`,
    isKo ? `납기: ${dueStr}` : `Due: ${dueStr}`,
    "",
    isKo ? `공급가액(만원): ₩${row.totalAmount.toLocaleString("ko-KR")}` : `Amount (10K KRW): ₩${row.totalAmount.toLocaleString("en-US")}`,
    "",
    ...bankLines(isKo),
  ];

  try {
    const contractPdf = await buildSimpleContractPdfBase64({
      isKo,
      title: isKo ? "싱커드 계약 요약" : "THINKAD contract summary",
      lines: contractLines,
    });
    const invoicePdf = await buildSimpleContractPdfBase64({
      isKo,
      title: isKo ? "싱커드 청구서" : "THINKAD invoice",
      lines: invoiceLines,
    });

    await sendEmailWithPdfAttachment({
      to,
      subject: isKo ? "[싱커드] 계약 요약 PDF" : "[THINKAD] Contract summary",
      text: isKo ? "계약 요약 PDF를 첨부합니다." : "Please find the contract summary attached.",
      html: isKo
        ? "<p>계약 요약 PDF를 첨부합니다.</p>"
        : "<p>Please find the contract summary attached.</p>",
      pdfFilename: "thinkad-contract-summary.pdf",
      pdfBase64: contractPdf,
    });

    await sendEmailWithPdfAttachment({
      to,
      subject: isKo ? "[싱커드] 청구서 PDF" : "[THINKAD] Invoice",
      text: isKo
        ? "청구서 PDF를 첨부합니다. 입금 후 담당자에게 연락 부탁드립니다."
        : "Please find the invoice attached.",
      html: isKo
        ? "<p>청구서 PDF를 첨부합니다.</p>"
        : "<p>Please find the invoice attached.</p>",
      pdfFilename: "thinkad-invoice.pdf",
      pdfBase64: invoicePdf,
    });

    await db.ooHQuote.update({
      where: { id },
      data: {
        status: OoHQuoteStatus.invoice_sent,
        invoiceSentAt: new Date(),
        invoiceDocUrl: "email:sent",
        contractDocUrl: "email:sent",
      },
    });

    return json({ ok: true, status: OoHQuoteStatus.invoice_sent });
  } catch (e) {
    console.error("[send-invoice]", e);
    const msg = e instanceof Error ? e.message : "Failed";
    if (msg === "Email not configured") {
      return json({ error: "Email not configured" }, 503);
    }
    return json({ error: "Send failed" }, 500);
  }
}

import { NextRequest } from "next/server";
import { OoHQuoteStatus } from "@prisma/client";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
import { canAdminSendInvoiceForContract } from "@/lib/contract-send-mode";
import { canAdminSendInvoice } from "@/lib/ooh-quote";
import { buildBillingDocumentPdfBase64 } from "@/lib/server-ooh-quote-pdf";
import { buildContractMoney, supplyWonFromManwonField } from "@/lib/contract-money";
import { parseOohContractMeta } from "@/lib/ooh-contract-meta";
import { getFormalQuoteIssuer } from "@/lib/formal-quote-issuer";
import { sendEmailWithPdfAttachment } from "@/lib/email/client";

export const dynamic = "force-dynamic";

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
  if (!row.oohContract || !canAdminSendInvoiceForContract(row.oohContract)) {
    return json(
      { error: "전자계약 서명(또는 첨부 발송) 완료 후 청구서를 발송할 수 있습니다." },
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

  const meta = parseOohContractMeta(row.adminNote);
  const breakdown = row.quoteBreakdown as {
    lines?: { mediaName: string; location?: string; lineSupplyWon: number }[];
    supplyWon?: number;
    subtotalWon?: number;
  } | null;
  const mediaSupply =
    breakdown?.supplyWon && breakdown.supplyWon > 0
      ? breakdown.supplyWon
      : supplyWonFromManwonField(row.totalAmount, breakdown?.subtotalWon);
  const money = buildContractMoney({
    mediaSupplyWon: mediaSupply,
    extraProductionWon: meta.extraProductionWon,
    extraInstallWon: meta.extraInstallWon,
    extraOtherWon: meta.extraOtherWon,
  });
  const mediaLines =
    breakdown?.lines?.map((line) => ({
      name: line.mediaName,
      spec: line.location,
      amountWon: line.lineSupplyWon,
    })) ?? [
      {
        name: isKo ? "매체비" : "Media fee",
        amountWon: money.mediaSupplyWon,
      },
    ];
  const extraLines = [
    { name: isKo ? "제작비" : "Production", amountWon: money.extraProductionWon },
    { name: isKo ? "설치비" : "Installation", amountWon: money.extraInstallWon },
    { name: isKo ? "기타" : "Other", amountWon: money.extraOtherWon },
  ].filter((l) => l.amountWon > 0);
  const issuer = getFormalQuoteIssuer();
  const bankName = process.env.QUOTE_BANK_NAME?.trim() || issuer.bank;
  const bankAccount = process.env.QUOTE_BANK_ACCOUNT?.trim() || issuer.account;
  const bankHolder = process.env.QUOTE_BANK_HOLDER?.trim() || issuer.holder;

  try {
    const shared = {
      isKo,
      clientName: row.clientName,
      company: row.clientCompany,
      period: row.period,
      lines: mediaLines,
      extraLines,
      supplyWon: money.supplyWon,
      vatWon: money.vatWon,
      totalWon: money.totalWon,
      bankName,
      bankAccount,
      bankHolder,
      contactEmail: meta.accountManagerEmail || issuer.email,
      contactPhone: meta.accountManagerPhone || issuer.tel,
    };
    const contractPdf = await buildBillingDocumentPdfBase64({
      ...shared,
      kind: "summary",
    });
    const invoicePdf = await buildBillingDocumentPdfBase64({
      ...shared,
      kind: "invoice",
      dueDate: dueStr,
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

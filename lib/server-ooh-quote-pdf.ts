import type { PrismaClient } from "@prisma/client";
import {
  quotePdfToBase64,
  type BuildQuotePdfParams,
  type QuoteTemplateId,
} from "@/lib/build-quote-pdf";

export type OoHQuotePdfSource = {
  clientCompany: string | null;
  clientName: string;
  period: string;
  budgetMin: number | null;
  budgetMax: number | null;
  pdfTemplate: string;
  locale: string;
  mediaIds: string[];
  totalAmount: number;
};

function templateId(raw: string): QuoteTemplateId {
  return raw === "premium" ? "premium" : "default";
}

export async function buildOoHQuotePdfParams(
  db: PrismaClient,
  row: OoHQuotePdfSource,
): Promise<BuildQuotePdfParams> {
  const isKo = row.locale !== "en";
  const media = await db.media.findMany({
    where: { id: { in: row.mediaIds }, isActive: true },
  });
  const order = new Map(row.mediaIds.map((id, i) => [id, i]));
  media.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

  const monthlyCost = media.reduce((s, m) => s + m.price, 0);
  const rows = media.map((m) => ({
    name: (isKo ? m.name : m.nameEn) || m.name,
    location: m.location,
    price: m.price,
  }));

  return {
    template: templateId(row.pdfTemplate),
    logoDataUrl: null,
    isKo,
    company: row.clientCompany ?? "",
    name: row.clientName,
    periodLabel: row.period,
    budgetMin: row.budgetMin,
    budgetMax: row.budgetMax,
    monthlyCost,
    totalCost: row.totalAmount,
    rows,
  };
}

export async function ooHQuotePdfToBase64(
  db: PrismaClient,
  row: OoHQuotePdfSource,
): Promise<string> {
  const params = await buildOoHQuotePdfParams(db, row);
  return quotePdfToBase64(params);
}

/** 간단 계약서/청구서 PDF (텍스트 위주, AI 없이 서버 생성) */
export async function buildSimpleContractPdfBase64(p: {
  isKo: boolean;
  title: string;
  lines: string[];
}): Promise<string> {
  const { default: JsPDF } = await import("jspdf");
  const doc = new JsPDF();
  const margin = 20;
  const pageW = doc.internal.pageSize.getWidth();
  let y = 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(p.title, margin, y);
  y += 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  for (const line of p.lines) {
    for (const chunk of doc.splitTextToSize(line, pageW - 2 * margin)) {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(chunk, margin, y);
      y += 5;
    }
    y += 2;
  }
  const dataUri = doc.output("datauristring") as string;
  const i = dataUri.indexOf(",");
  return i >= 0 ? dataUri.slice(i + 1) : dataUri;
}

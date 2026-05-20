import { CONTACT_EMAIL } from "@/lib/constants";
export type QuoteTemplateId = "default" | "premium";

export type QuotePdfRow = {
  name: string;
  location: string;
  price: number;
  /** Preferred for PDF (English / romanized). */
  nameAscii?: string;
  locationAscii?: string;
  /** Est. impressions for campaign period */
  impressions?: number;
  /** Kakao static map JPEG/PNG base64 */
  mapImageBase64?: string | null;
};

export type QuotePdfTimelineStep = {
  label: string;
  date: string;
};

export type BuildQuotePdfParams = {
  template: QuoteTemplateId;
  logoDataUrl: string | null;
  /** Site UI locale — logged only; PDF is always English + Helvetica. */
  isKo?: boolean;
  company: string;
  name: string;
  /** English period line for PDF (e.g. "3 months") — avoids CJK in Helvetica. */
  periodLabelPdf: string;
  /** 만원 단위; 미입력 시 null */
  budgetMin: number | null;
  budgetMax: number | null;
  monthlyCost: number;
  totalCost: number;
  rows: QuotePdfRow[];
  validUntil?: string | null;
  supplyWon?: number | null;
  vatWon?: number | null;
  totalWithVatManwon?: number | null;
  timeline?: QuotePdfTimelineStep[];
  accountManagerName?: string;
};

const HELV = "helvetica";

/** Helvetica cannot render Hangul; prefer ASCII fields, then strip non‑Latin. */
function pdfSafeLine(s: string | undefined, fallback: string): string {
  const raw = (s ?? "").trim();
  if (!raw) return fallback;
  const ascii = raw.replace(/[^\x20-\x7E]/g, "").trim();
  if (ascii.length >= 2) return ascii.slice(0, 500);
  return fallback;
}

function rowForPdf(row: QuotePdfRow): { name: string; location: string } {
  const name = pdfSafeLine(row.nameAscii, pdfSafeLine(row.name, "Media"));
  const location = pdfSafeLine(
    row.locationAscii,
    pdfSafeLine(row.location, "—"),
  );
  return { name, location };
}

function guessImageFormat(dataUrl: string): "PNG" | "JPEG" | "WEBP" {
  if (dataUrl.startsWith("data:image/png")) return "PNG";
  if (dataUrl.startsWith("data:image/webp")) return "WEBP";
  return "JPEG";
}

function formatBudgetOverviewLine(
  min: number | null,
  max: number | null,
): string | null {
  if (min == null && max == null) return null;
  const fmt = (n: number) => n.toLocaleString("en-US");
  if (min != null && max != null) {
    return `Budget range: ₩${fmt(min)} – ₩${fmt(max)} (10K KRW / month)`;
  }
  if (min != null) {
    return `Min. budget: ₩${fmt(min)} (10K KRW / month)`;
  }
  return `Max. budget: ₩${fmt(max!)} (10K KRW / month)`;
}

function setHelv(
  doc: import("jspdf").jsPDF,
  style: "normal" | "bold" | "italic",
) {
  try {
    if (style === "bold") doc.setFont(HELV, "bold");
    else if (style === "italic") doc.setFont(HELV, "italic");
    else doc.setFont(HELV, "normal");
  } catch {
    doc.setFont(HELV, "normal");
  }
}

export async function createQuotePdfDoc(p: BuildQuotePdfParams) {
  const { default: JsPDF } = await import("jspdf");
  const doc = new JsPDF();

  console.log("[pdf:quote]", {
    rowCount: p.rows.length,
    uiKo: p.isKo,
    mode: "english+helvetica",
    monthlyCost: p.monthlyCost,
    totalCost: p.totalCost,
  });

  const isPremium = p.template === "premium";
  const margin = 20;
  const pageW = doc.internal.pageSize.getWidth();
  let y = 18;

  if (isPremium) {
    doc.setFillColor(212, 175, 55);
    doc.rect(0, 0, pageW, 11, "F");
    y = 22;
  }

  if (p.logoDataUrl) {
    try {
      const fmt = guessImageFormat(p.logoDataUrl);
      const logoW = 28;
      const logoH = 28;
      doc.addImage(p.logoDataUrl, fmt, pageW - margin - logoW, 14, logoW, logoH);
    } catch {
      /* ignore bad logo */
    }
  }

  setHelv(doc, "bold");
  doc.setFontSize(isPremium ? 20 : 18);
  doc.setTextColor(isPremium ? 15 : 0, isPremium ? 23 : 0, isPremium ? 42 : 0);
  doc.text("THINKAD Quote", margin, y);
  y += isPremium ? 12 : 10;

  doc.setFontSize(10);
  setHelv(doc, "normal");
  doc.setTextColor(60, 60, 60);
  const issued = new Date().toISOString().slice(0, 10);
  doc.text(`Date: ${issued}`, margin, y);
  y += 6;
  if (p.validUntil) {
    doc.text(`Valid until: ${p.validUntil.slice(0, 10)}`, margin, y);
    y += 6;
  }

  const companyLine = pdfSafeLine(p.company, "—");
  const nameLine = pdfSafeLine(p.name, "—");
  doc.text(`Company: ${companyLine} / Contact: ${nameLine}`, margin, y);
  y += 8;

  setHelv(doc, "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("Campaign overview", margin, y);
  y += 7;

  doc.setFontSize(10);
  setHelv(doc, "normal");
  doc.text(`Period: ${p.periodLabelPdf}`, margin, y);
  y += 6;
  doc.text(
    `Est. monthly: ₩${p.monthlyCost.toLocaleString("en-US")} (10K KRW)`,
    margin,
    y,
  );
  y += 6;
  doc.text(
    `Est. total: ₩${p.totalCost.toLocaleString("en-US")} (10K KRW)`,
    margin,
    y,
  );
  y += 6;

  const budgetLine = formatBudgetOverviewLine(p.budgetMin, p.budgetMax);
  if (budgetLine) {
    doc.text(budgetLine, margin, y);
    y += 6;
  }
  y += 4;

  setHelv(doc, "bold");
  doc.setFontSize(11);
  doc.text("Media detail", margin, y);
  y += 5;

  if (isPremium) {
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.4);
  } else {
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.2);
  }

  doc.setFontSize(9);
  doc.text("Media", margin, y);
  doc.text("Location", 88, y);
  doc.text("Monthly", pageW - margin, y, { align: "right" });
  y += 3;
  doc.line(margin, y, pageW - margin, y);
  y += 5;

  setHelv(doc, "normal");
  for (const row of p.rows) {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    const { name: rn, location: rl } = rowForPdf(row);
    const nameLines = doc.splitTextToSize(rn, 60);
    doc.text(nameLines[0] ?? rn, margin, y);
    const locLines = doc.splitTextToSize(rl, 58);
    doc.text(locLines[0] ?? rl, 88, y);
    doc.text(
      row.price.toLocaleString("en-US"),
      pageW - margin,
      y,
      { align: "right" },
    );
    y += 6;
    if (row.impressions != null && row.impressions > 0) {
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Est. impressions: ${row.impressions.toLocaleString("en-US")}`,
        margin,
        y,
      );
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      y += 5;
    }
    if (row.mapImageBase64) {
      try {
        if (y > 200) {
          doc.addPage();
          y = 20;
        }
        const mapW = pageW - 2 * margin;
        const mapH = 42;
        doc.addImage(
          `data:image/png;base64,${row.mapImageBase64}`,
          "PNG",
          margin,
          y,
          mapW,
          mapH,
        );
        y += mapH + 6;
      } catch {
        /* ignore map render errors */
      }
    }
    y += 2;
  }

  if (y + 24 > 280) {
    doc.addPage();
    y = 20;
  }
  y += 4;
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  setHelv(doc, "bold");
  doc.setFontSize(11);
  if (p.supplyWon != null && p.vatWon != null) {
    doc.text(
      `Subtotal: KRW ${p.supplyWon.toLocaleString("en-US")}`,
      margin,
      y,
    );
    y += 6;
    doc.text(`VAT (10%): KRW ${p.vatWon.toLocaleString("en-US")}`, margin, y);
    y += 6;
    const totalMan =
      p.totalWithVatManwon ??
      Math.round((p.supplyWon + p.vatWon) / 10_000);
    doc.text(
      `Grand total: KRW ${(totalMan * 10_000).toLocaleString("en-US")} (~${totalMan.toLocaleString("en-US")} x 10K)`,
      margin,
      y,
    );
    y += 8;
  } else {
    doc.text(
      `Total (excl. VAT): ₩${p.totalCost.toLocaleString("en-US")} (10K KRW)`,
      margin,
      y,
    );
    y += 10;
  }

  if (p.timeline && p.timeline.length > 0) {
    if (y > 240) {
      doc.addPage();
      y = 20;
    }
    setHelv(doc, "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("Campaign timeline", margin, y);
    y += 7;
    setHelv(doc, "normal");
    doc.setFontSize(9);
    for (const step of p.timeline) {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
      doc.text(`${step.date} — ${pdfSafeLine(step.label, "Step")}`, margin, y);
      y += 5;
    }
    y += 4;
  }

  if (p.accountManagerName) {
    if (y > 265) {
      doc.addPage();
      y = 20;
    }
    y += 4;
    doc.line(margin, y, margin + 70, y);
    y += 8;
    setHelv(doc, "normal");
    doc.setFontSize(9);
    doc.text("THINKAD Account Manager", margin, y);
    y += 5;
    setHelv(doc, "bold");
    doc.text(pdfSafeLine(p.accountManagerName, "Sales Team"), margin, y);
    y += 10;
  }

  doc.setFontSize(8);
  setHelv(doc, "italic");
  doc.setTextColor(100, 100, 100);
  const disc =
    "Illustrative quote only; final terms depend on inventory and contract. " +
    "Korean names and addresses: see the online quote or email confirmation for full text.";
  for (const line of doc.splitTextToSize(disc, pageW - 2 * margin)) {
    if (y > 285) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, margin, y);
    y += 4;
  }
  y += 2;
  setHelv(doc, "normal");
  doc.text(`Contact: ${CONTACT_EMAIL} · +82-2-515-2772`, margin, y);

  return doc;
}

export async function saveQuotePdf(p: BuildQuotePdfParams, filename: string) {
  const doc = await createQuotePdfDoc(p);
  doc.save(filename);
}

export async function quotePdfToBase64(p: BuildQuotePdfParams): Promise<string> {
  const doc = await createQuotePdfDoc(p);
  const dataUri = doc.output("datauristring") as string;
  const i = dataUri.indexOf(",");
  return i >= 0 ? dataUri.slice(i + 1) : dataUri;
}

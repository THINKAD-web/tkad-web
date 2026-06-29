import type { jsPDF } from "jspdf";
import {
  krFontFamily,
  registerNotoSansKrIfAvailable,
} from "@/lib/jspdf-register-noto-kr";
import { CONTACT_EMAIL } from "@/lib/constants";
import { loadQuoteStampDataUrl } from "@/lib/quote-pdf-assets";
import { getQuoteStampUrl } from "@/lib/quote-stamp";

/** THINKAD brand — globals.css navy / gold */
const NAVY: [number, number, number] = [26, 42, 108];
const NAVY_DARK: [number, number, number] = [18, 26, 58];
const GOLD: [number, number, number] = [232, 213, 181];
const GOLD_DARK: [number, number, number] = [201, 184, 150];
const MUTED: [number, number, number] = [90, 99, 114];

export type AdminFormalQuotePdfRow = {
  name: string;
  spec: string;
  period: string;
  /** 월 단가 (원) */
  unitPriceWon: number;
  quantity: number;
  lineTotalWon: number;
};

export type AdminFormalQuotePdfParams = {
  isKo: boolean;
  logoDataUrl?: string | null;
  quoteNumber: string;
  issueDate: string;
  validUntil: string;
  clientCompany: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  periodLabel: string;
  vatIncluded: boolean;
  /** 소계에서 차감된 할인 합계(원) */
  discountTotalWon: number;
  /** PDF 할인 행 설명 (예: 할인율 10% · 할인액 ₩5,000) */
  discountSummary?: string;
  rows: AdminFormalQuotePdfRow[];
  linesSubtotalWon: number;
  supplyWon: number;
  vatWon: number;
  totalWon: number;
};

const DEFAULT_ISSUER = {
  companyKo: "(주)싱커드",
  companyEn: "THINKAD Inc.",
  taglineKo: "OOH 광고 · 미디어 플래닝",
  taglineEn: "OOH advertising & media planning",
  address:
    process.env.QUOTE_ISSUER_ADDRESS?.trim() ||
    "서울특별시 (주소는 환경변수 QUOTE_ISSUER_ADDRESS로 설정)",
  regNo:
    process.env.QUOTE_ISSUER_REG_NO?.trim() || "사업자등록번호: (등록 후 입력)",
  tel: process.env.QUOTE_ISSUER_TEL?.trim() || "02-515-2772",
  email: process.env.QUOTE_ISSUER_EMAIL?.trim() || CONTACT_EMAIL,
  bank: process.env.QUOTE_BANK_NAME?.trim() || "국민은행",
  account: process.env.QUOTE_BANK_ACCOUNT?.trim() || "000000-00-000000",
  holder: process.env.QUOTE_BANK_HOLDER?.trim() || "(주)싱커드",
  salesTitle: process.env.QUOTE_SALES_TITLE?.trim() || "견적·제안",
};

function guessImageFormat(dataUrl: string): "PNG" | "JPEG" | "WEBP" {
  if (dataUrl.startsWith("data:image/png")) return "PNG";
  if (dataUrl.startsWith("data:image/webp")) return "WEBP";
  return "JPEG";
}

function fmtWon(n: number, isKo: boolean) {
  return `₩${Math.round(n).toLocaleString(isKo ? "ko-KR" : "en-US")}`;
}

async function resolveFormalStampDataUrl(): Promise<string | null> {
  const local = loadQuoteStampDataUrl();
  if (local) return local;
  const url = getQuoteStampUrl();
  if (!url || url.startsWith("/")) return null;
  try {
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "image/png";
    if (!ct.startsWith("image/")) return null;
    const ab = await res.arrayBuffer();
    const b64 = Buffer.from(ab).toString("base64");
    return `data:${ct};base64,${b64}`;
  } catch {
    return null;
  }
}

function setFont(doc: jsPDF, fam: string, style: "normal" | "bold") {
  const s = style === "bold" ? "bold" : "normal";
  try {
    doc.setFont(fam, s);
  } catch {
    doc.setFont(fam, "normal");
  }
}

export async function createAdminFormalQuotePdfDoc(
  p: AdminFormalQuotePdfParams,
): Promise<jsPDF> {
  const { default: JsPDF } = await import("jspdf");
  const doc = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const hasKr = registerNotoSansKrIfAvailable(doc);
  const fam = krFontFamily(hasKr);
  const margin = 14;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const innerW = pageW - margin * 2;
  let y = 0;

  const headerH = 22;
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, headerH, "F");
  doc.setDrawColor(...GOLD_DARK);
  doc.setLineWidth(0.35);
  doc.line(0, headerH, pageW, headerH);

  if (p.logoDataUrl) {
    try {
      const fmt = guessImageFormat(p.logoDataUrl);
      const lw = 22;
      const lh = 14;
      doc.addImage(p.logoDataUrl, fmt, margin, 4, lw, lh);
    } catch {
      /* ignore */
    }
  }

  doc.setTextColor(...GOLD);
  setFont(doc, fam, "bold");
  doc.setFontSize(15);
  doc.text("THINKAD", margin + (p.logoDataUrl ? 26 : 0), 11);
  doc.setFontSize(8.5);
  setFont(doc, fam, "normal");
  doc.text(
    p.isKo ? DEFAULT_ISSUER.taglineKo : DEFAULT_ISSUER.taglineEn,
    margin + (p.logoDataUrl ? 26 : 0),
    16,
  );

  doc.setTextColor(...GOLD);
  setFont(doc, fam, "bold");
  doc.setFontSize(11);
  doc.text(p.isKo ? "견 적 서" : "QUOTATION", pageW - margin, 11, {
    align: "right",
  });
  doc.setFontSize(7.5);
  setFont(doc, fam, "normal");
  doc.text(
    p.isKo ? "Quotation" : "견적서",
    pageW - margin,
    16,
    { align: "right" },
  );

  y = headerH + 8;
  doc.setTextColor(...NAVY_DARK);
  setFont(doc, fam, "normal");
  doc.setFontSize(8);
  const issuerLines = [
    `${p.isKo ? DEFAULT_ISSUER.companyKo : DEFAULT_ISSUER.companyEn} · THINKAD`,
    DEFAULT_ISSUER.address,
    DEFAULT_ISSUER.regNo,
    `${p.isKo ? "대표전화" : "Tel"}. ${DEFAULT_ISSUER.tel}  |  E-mail ${DEFAULT_ISSUER.email}`,
  ];
  for (const line of issuerLines) {
    for (const w of doc.splitTextToSize(line, innerW)) {
      doc.text(w, margin, y);
      y += 4;
    }
  }
  y += 3;

  const boxH = 32;
  doc.setDrawColor(...GOLD_DARK);
  doc.setLineWidth(0.25);
  doc.roundedRect(margin, y, innerW * 0.48, boxH, 2, 2, "S");
  doc.roundedRect(margin + innerW * 0.52, y, innerW * 0.48, boxH, 2, 2, "S");

  const metaX = margin + 3;
  let metaY = y + 5;
  doc.setFontSize(8);
  setFont(doc, fam, "bold");
  doc.setTextColor(...NAVY);
  doc.text(p.isKo ? "견적 정보" : "Quote info", metaX, metaY);
  metaY += 5;
  setFont(doc, fam, "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  const metaRows = [
    [
      p.isKo ? "견적번호" : "Quote No.",
      p.quoteNumber,
    ],
    [p.isKo ? "발행일" : "Issue date", p.issueDate],
    [p.isKo ? "유효기간" : "Valid until", p.validUntil],
  ];
  for (const [k, v] of metaRows) {
    doc.text(`${k}:`, metaX, metaY);
    doc.setTextColor(...NAVY_DARK);
    const vw = doc.splitTextToSize(String(v), innerW * 0.48 - 28);
    doc.text(vw[0] ?? String(v), metaX + 26, metaY);
    doc.setTextColor(...MUTED);
    metaY += 4.2;
  }

  const cx = margin + innerW * 0.52 + 3;
  let cy = y + 5;
  setFont(doc, fam, "bold");
  doc.setTextColor(...NAVY);
  doc.text(p.isKo ? "수신 (고객사)" : "Bill to", cx, cy);
  cy += 5;
  setFont(doc, fam, "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  const clientBlock = [
    `${p.isKo ? "회사" : "Company"}: ${p.clientCompany || "—"}`,
    `${p.isKo ? "담당자" : "Contact"}: ${p.clientName || "—"}`,
    `${p.isKo ? "연락처" : "Phone"}: ${p.clientPhone || "—"}`,
  ];
  if (p.clientEmail?.trim()) {
    clientBlock.push(`E-mail: ${p.clientEmail.trim()}`);
  }
  for (const line of clientBlock) {
    for (const w of doc.splitTextToSize(line, innerW * 0.45)) {
      doc.setTextColor(...NAVY_DARK);
      doc.text(w, cx, cy);
      cy += 4;
    }
  }

  y += boxH + 8;

  setFont(doc, fam, "bold");
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text(
    `${p.isKo ? "집행 기간" : "Campaign period"}: ${p.periodLabel}`,
    margin,
    y,
  );
  y += 2;
  doc.setFontSize(7);
  setFont(doc, fam, "normal");
  doc.setTextColor(...MUTED);
  doc.text(
    p.vatIncluded
      ? p.isKo
        ? "※ 금액 표기: 부가세 포함 기준"
        : "※ Amounts: VAT-inclusive basis"
      : p.isKo
        ? "※ 금액 표기: 공급가액 기준 (부가세 별도)"
        : "※ Amounts: supply value (VAT extra)",
    margin,
    y + 4,
  );
  y += 8;

  const colX = [
    margin,
    margin + 48,
    margin + 86,
    margin + 118,
    margin + 152,
    margin + 166,
  ];
  const colW = [46, 36, 30, 32, 12, innerW - (166 - margin)];

  const drawTableHeader = (yy: number) => {
    doc.setFillColor(...NAVY);
    doc.rect(margin, yy - 4, innerW, 7, "F");
    doc.setTextColor(...GOLD);
    setFont(doc, fam, "bold");
    doc.setFontSize(7.5);
    const heads = p.isKo
      ? ["매체명", "규격", "기간", "월 단가(원)", "수량", "금액(원)"]
      : ["Media", "Specs", "Period", "Unit/mo", "Qty", "Amount"];
    doc.text(heads[0], colX[0] + 1, yy);
    doc.text(heads[1], colX[1] + 1, yy);
    doc.text(heads[2], colX[2] + 1, yy);
    doc.text(heads[3], colX[3] + 1, yy);
    doc.text(heads[4], colX[4] + 0.5, yy);
    doc.text(heads[5], colX[5] + 1, yy);
    return yy + 5;
  };

  y = drawTableHeader(y);
  doc.setTextColor(...NAVY_DARK);
  setFont(doc, fam, "normal");
  doc.setFontSize(7);

  const rowH = 6;
  for (const row of p.rows) {
    if (y > pageH - 55) {
      doc.addPage();
      y = margin + 6;
      y = drawTableHeader(y);
      doc.setTextColor(...NAVY_DARK);
      setFont(doc, fam, "normal");
      doc.setFontSize(7);
    }
    const nameLines = doc.splitTextToSize(row.name, colW[0] - 2);
    const specLines = doc.splitTextToSize(row.spec || "—", colW[1] - 2);
    const periodLines = doc.splitTextToSize(row.period, colW[2] - 2);
    const linesNeeded = Math.max(
      nameLines.length,
      specLines.length,
      periodLines.length,
      1,
    );
    const h = Math.max(rowH, linesNeeded * 3.2 + 2);

    doc.setDrawColor(220, 224, 232);
    doc.line(margin, y + h - 1, margin + innerW, y + h - 1);

    let ly = y + 3.5;
    for (let i = 0; i < nameLines.length; i++) {
      doc.text(nameLines[i]!, colX[0] + 1, ly + i * 3.2);
    }
    ly = y + 3.5;
    for (let i = 0; i < specLines.length; i++) {
      doc.text(specLines[i]!, colX[1] + 1, ly + i * 3.2);
    }
    ly = y + 3.5;
    for (let i = 0; i < periodLines.length; i++) {
      doc.text(periodLines[i]!, colX[2] + 1, ly + i * 3.2);
    }
    doc.text(fmtWon(row.unitPriceWon, p.isKo), colX[3] + colW[3] - 1, y + 3.5, {
      align: "right",
    });
    doc.text(String(row.quantity), colX[4] + colW[4] / 2, y + 3.5, {
      align: "center",
    });
    doc.text(fmtWon(row.lineTotalWon, p.isKo), colX[5] + colW[5] - 1, y + 3.5, {
      align: "right",
    });
    y += h;
  }

  y += 4;
  if (y > pageH - 62) {
    doc.addPage();
    y = margin + 6;
  }

  const sumX = margin + innerW * 0.42;
  const sumW = innerW * 0.58;
  const valX = sumX + sumW - 1;

  doc.setFontSize(8);
  const sumRows: [string, string][] = [
    [p.isKo ? "소계" : "Subtotal", fmtWon(p.linesSubtotalWon, p.isKo)],
  ];
  if (p.discountTotalWon > 0) {
    sumRows.push([
      p.discountSummary ??
        (p.isKo ? "할인" : "Discount"),
      `− ${fmtWon(p.discountTotalWon, p.isKo)}`,
    ]);
  }
  sumRows.push(
    [p.isKo ? "공급가액" : "Supply", fmtWon(p.supplyWon, p.isKo)],
    [p.isKo ? "부가세 (10%)" : "VAT (10%)", fmtWon(p.vatWon, p.isKo)],
  );

  for (const [lab, val] of sumRows) {
    doc.setTextColor(...MUTED);
    setFont(doc, fam, "normal");
    doc.text(lab, sumX, y);
    doc.setTextColor(...NAVY_DARK);
    setFont(doc, fam, "bold");
    doc.text(val, valX, y, { align: "right" });
    y += 5;
  }

  y += 2;
  const goldTint: [number, number, number] = [243, 234, 214];
  doc.setFillColor(...goldTint);
  doc.roundedRect(sumX, y - 3, sumW, 10, 1.5, 1.5, "F");
  doc.setTextColor(...NAVY);
  setFont(doc, fam, "bold");
  doc.setFontSize(10);
  doc.text(p.isKo ? "합계" : "Total", sumX + 2, y + 3);
  doc.text(fmtWon(p.totalWon, p.isKo), valX, y + 3, { align: "right" });
  y += 14;

  if (y > pageH - 48) {
    doc.addPage();
    y = margin + 6;
  }

  doc.setDrawColor(...GOLD_DARK);
  doc.setLineWidth(0.2);
  doc.line(margin, y, margin + innerW, y);
  y += 6;

  doc.setFontSize(8);
  setFont(doc, fam, "bold");
  doc.setTextColor(...NAVY);
  doc.text(p.isKo ? "입금 계좌" : "Bank transfer", margin, y);
  y += 5;
  setFont(doc, fam, "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...NAVY_DARK);
  const bankLines = [
    `${DEFAULT_ISSUER.bank} ${DEFAULT_ISSUER.account}`,
    `${p.isKo ? "예금주" : "Account holder"}: ${DEFAULT_ISSUER.holder}`,
  ];
  for (const line of bankLines) {
    doc.text(line, margin, y);
    y += 4;
  }
  y += 3;

  setFont(doc, fam, "bold");
  doc.setTextColor(...NAVY);
  doc.text(p.isKo ? "담당자 연락처" : "Sales contact", margin, y);
  y += 5;
  setFont(doc, fam, "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...NAVY_DARK);
  doc.text(`${DEFAULT_ISSUER.salesTitle} · ${DEFAULT_ISSUER.tel}`, margin, y);
  y += 4;
  doc.text(DEFAULT_ISSUER.email, margin, y);
  y += 6;

  const stampData = await resolveFormalStampDataUrl();
  if (stampData) {
    try {
      doc.addImage(
        stampData,
        "PNG",
        pageW - margin - 30,
        y - 2,
        26,
        26,
        undefined,
        "FAST",
        -3,
      );
    } catch {
      /* stamp optional */
    }
  }

  doc.setFontSize(6.5);
  doc.setTextColor(...MUTED);
  setFont(doc, fam, "normal");
  const foot = p.isKo
    ? "본 견적은 발행일부터 유효기간 내에 한하며, 실제 계약 시 재고·조건에 따라 변경될 수 있습니다."
    : "This quote is valid until the date shown and may change subject to availability and final contract terms.";
  for (const line of doc.splitTextToSize(foot, innerW)) {
    if (y > pageH - 8) {
      doc.addPage();
      y = margin;
    }
    doc.text(line, margin, y);
    y += 3.5;
  }

  return doc;
}

export async function adminFormalQuotePdfBuffer(
  p: AdminFormalQuotePdfParams,
): Promise<Buffer> {
  try {
    const doc = await createAdminFormalQuotePdfDoc(p);
    const out = doc.output("arraybuffer");
    if (!(out instanceof ArrayBuffer)) {
      throw new Error("jsPDF output(arraybuffer) did not return ArrayBuffer");
    }
    return Buffer.from(out);
  } catch (e) {
    console.error("[adminFormalQuotePdfBuffer]", e);
    throw e instanceof Error ? e : new Error(String(e));
  }
}

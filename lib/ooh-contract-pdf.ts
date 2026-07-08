import { createHash } from "node:crypto";
import {
  ensureKrFontForServerPdf,
  krFontFamily,
} from "@/lib/jspdf-register-noto-kr";
import {
  OOH_CONTRACT_DEFAULT_SPECIAL_TERMS_EN,
  OOH_CONTRACT_GENERAL_TERMS_EN,
} from "@/lib/ooh-contract-display";
import {
  buildOohContractKoTemplate,
  OOH_CONTRACT_PARTY_B_KO,
  type OohContractTemplateVars,
} from "@/lib/ooh-contract-template-ko";

export type OohContractPdfVars = {
  isKo: boolean;
  contractId: string;
  /** KO 11조 표준 템플릿 필드 */
  clientCompany: string;
  clientRepName: string;
  clientAddress: string;
  clientPhone: string;
  campaignName: string;
  periodStart: string;
  periodEnd: string;
  periodMonths: string;
  productionCost: string;
  mediaCount: string;
  totalAmount: string;
  amountKorean: string;
  paymentMethod: string;
  contractDate: string;
  /** EN 레거시 6조 PDF (isKo=false) */
  advertiserLine?: string;
  mediaLines?: string[];
  period?: string;
  amountLine?: string;
  specialTerms?: string | null;
};

export type OohContractSignAudit = {
  documentNumber: string;
  signerName: string;
  signerEmail: string;
  signedAtIso: string;
  signedAtKst: string;
  signerIp: string;
  signerAgent: string;
  documentContentSha256: string;
  signatureImageSha256: string;
};

const PAGE_BOTTOM = 275;
const LINE_H = 5;
const BODY_PT = 10;
const TITLE_PT = 16;

function wrapLines(
  doc: import("jspdf").default,
  text: string,
  maxW: number,
): string[] {
  return doc.splitTextToSize(text, maxW) as string[];
}

function setContractFont(
  doc: import("jspdf").default,
  fam: string,
  style: "normal" | "bold" | "italic",
) {
  const resolved =
    style === "italic" && fam !== "helvetica" ? "normal" : style;
  try {
    doc.setFont(fam, resolved);
  } catch {
    doc.setFont(fam, "normal");
  }
}

function pdfVarsToTemplateVars(vars: OohContractPdfVars): OohContractTemplateVars {
  return {
    clientCompany: vars.clientCompany,
    clientRepName: vars.clientRepName,
    clientAddress: vars.clientAddress,
    clientPhone: vars.clientPhone,
    campaignName: vars.campaignName,
    periodStart: vars.periodStart,
    periodEnd: vars.periodEnd,
    periodMonths: vars.periodMonths,
    productionCost: vars.productionCost,
    mediaCount: vars.mediaCount,
    totalAmount: vars.totalAmount,
    amountKorean: vars.amountKorean,
    paymentMethod: vars.paymentMethod,
    contractDate: vars.contractDate,
  };
}

function ensurePageSpace(
  doc: import("jspdf").default,
  y: number,
  need: number,
): number {
  if (y + need > PAGE_BOTTOM) {
    doc.addPage();
    return 18;
  }
  return y;
}

function drawParagraphs(
  doc: import("jspdf").default,
  fam: string,
  paragraphs: readonly string[],
  margin: number,
  maxW: number,
  yStart: number,
  fontSize = BODY_PT,
): number {
  let y = yStart;
  setContractFont(doc, fam, "normal");
  doc.setFontSize(fontSize);
  doc.setTextColor(0, 0, 0);
  for (const para of paragraphs) {
    if (!para.trim()) continue;
    for (const line of wrapLines(doc, para, maxW)) {
      y = ensurePageSpace(doc, y, LINE_H);
      doc.text(line, margin, y);
      y += LINE_H;
    }
    y += 2;
  }
  return y;
}

function renderKoSignatureSection(
  doc: import("jspdf").default,
  fam: string,
  paragraphs: readonly string[],
  margin: number,
  maxW: number,
  pageW: number,
  yStart: number,
  options?: {
    signaturePngBase64?: string;
  },
): number {
  let y = yStart;
  const partyB = OOH_CONTRACT_PARTY_B_KO;

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i]!;
    if (!para.trim()) continue;

    if (i === 0) {
      y = drawParagraphs(doc, fam, [para], margin, maxW, y);
      y += 4;
      continue;
    }

    if (i === 1) {
      y = ensurePageSpace(doc, y, LINE_H * 3);
      for (const line of wrapLines(doc, para, maxW)) {
        y = ensurePageSpace(doc, y, LINE_H);
        doc.text(line, margin, y);
        y += LINE_H;
      }

      const sigW = 56;
      const sigH = 22;
      const sigX = pageW - margin - sigW;
      const sigY = y - LINE_H - 2;

      if (options?.signaturePngBase64) {
        const raw = options.signaturePngBase64.includes(",")
          ? options.signaturePngBase64.split(",")[1]!
          : options.signaturePngBase64;
        try {
          doc.addImage(raw, "PNG", sigX, sigY, sigW, sigH);
        } catch {
          doc.text("(서명 이미지 처리 오류)", margin, y + 4);
        }
      } else {
        doc.setDrawColor(180, 180, 180);
        doc.rect(sigX, sigY, sigW, sigH);
        setContractFont(doc, fam, "italic");
        doc.setFontSize(8);
        doc.text("서명", sigX + 4, sigY + 13);
        doc.setFontSize(BODY_PT);
        setContractFont(doc, fam, "normal");
      }
      y += 8;
      continue;
    }

    if (i === 2) {
      y = ensurePageSpace(doc, y, LINE_H * 4);
      for (const line of wrapLines(doc, para, maxW)) {
        y = ensurePageSpace(doc, y, LINE_H);
        doc.text(line, margin, y);
        y += LINE_H;
      }
      const stampW = 28;
      const stampH = 28;
      const stampX = pageW - margin - stampW;
      const stampY = y - LINE_H - 4;
      doc.setDrawColor(160, 160, 160);
      doc.setLineWidth(0.4);
      doc.circle(stampX + stampW / 2, stampY + stampH / 2, stampW / 2 - 1);
      setContractFont(doc, fam, "normal");
      doc.setFontSize(7);
      doc.setTextColor(80, 80, 80);
      doc.text(partyB.companyName.replace(/^\(주\)/, ""), stampX + 3, stampY + 10);
      doc.text("(인)", stampX + stampW / 2, stampY + stampH - 6, { align: "center" });
      doc.setFontSize(BODY_PT);
      doc.setTextColor(0, 0, 0);
      y += 10;
    }
  }

  return y;
}

async function buildKoStandardContractPdf(
  vars: OohContractPdfVars,
  options?: {
    signaturePngBase64?: string;
    audit?: OohContractSignAudit;
  },
): Promise<{ pdfBase64: string; sha256: string }> {
  const { default: JsPDF } = await import("jspdf");
  const doc = new JsPDF();
  const margin = 18;
  const pageW = doc.internal.pageSize.getWidth();
  const maxW = pageW - 2 * margin;

  const hasKr = await ensureKrFontForServerPdf(doc);
  const fam = krFontFamily(hasKr);

  const template = buildOohContractKoTemplate(pdfVarsToTemplateVars(vars));
  let y = 20;

  for (const section of template.sections) {
    if (section.kind === "title") {
      y = ensurePageSpace(doc, y, 14);
      setContractFont(doc, fam, "bold");
      doc.setFontSize(TITLE_PT);
      doc.setTextColor(15, 23, 42);
      doc.text(section.heading, pageW / 2, y, { align: "center" });
      y += 14;
      continue;
    }

    if (section.kind === "signature") {
      y = renderKoSignatureSection(
        doc,
        fam,
        section.paragraphs,
        margin,
        maxW,
        pageW,
        y,
        { signaturePngBase64: options?.signaturePngBase64 },
      );
      continue;
    }

    y = drawParagraphs(doc, fam, section.paragraphs, margin, maxW, y);
    y += 2;
  }

  if (options?.audit) {
    y = ensurePageSpace(doc, y, 40);
    setContractFont(doc, fam, "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text("전자서명 증거 기록", margin, y);
    y += 7;

    setContractFont(doc, fam, "normal");
    doc.setFontSize(7);
    doc.setTextColor(50, 50, 50);
    const a = options.audit;
    const block = [
      "본 문서는 전자서명법에 따른 전자서명이 적용되었습니다.",
      `문서 고유번호: ${a.documentNumber}`,
      `서명자: ${a.signerName} <${a.signerEmail}>`,
      `서명 일시(KST): ${a.signedAtKst}`,
      `IP: ${a.signerIp}`,
      `계약서 내용 해시(SHA-256): ${a.documentContentSha256}`,
      `서명 이미지 해시(SHA-256): ${a.signatureImageSha256}`,
      `기기: ${a.signerAgent.slice(0, 160)}${a.signerAgent.length > 160 ? "…" : ""}`,
    ];
    for (const row of block) {
      for (const line of wrapLines(doc, row, maxW)) {
        y = ensurePageSpace(doc, y, 3.5);
        doc.text(line, margin, y);
        y += 3.5;
      }
    }
  }

  const dataUri = doc.output("datauristring") as string;
  const i = dataUri.indexOf(",");
  const pdfBase64 = i >= 0 ? dataUri.slice(i + 1) : dataUri;
  const buf = Buffer.from(pdfBase64, "base64");
  const sha256 = createHash("sha256").update(buf).digest("hex");
  return { pdfBase64, sha256 };
}

/** EN 레거시 6조 PDF — isKo=false 전용 */
async function buildLegacyEnContractPdf(
  vars: OohContractPdfVars,
  options?: {
    signaturePngBase64?: string;
    audit?: OohContractSignAudit;
  },
): Promise<{ pdfBase64: string; sha256: string }> {
  const { default: JsPDF } = await import("jspdf");
  const doc = new JsPDF();
  const margin = 18;
  const pageW = doc.internal.pageSize.getWidth();
  const maxW = pageW - 2 * margin;
  let y = 18;
  const fam = "helvetica";

  setContractFont(doc, fam, "bold");
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text("OOH Media Advertising Agreement (Standard)", margin, y);
  y += 10;

  doc.setFontSize(8);
  setContractFont(doc, fam, "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`ID: ${vars.contractId}`, margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);

  const sections: { title: string; body: string | string[] }[] = [
    {
      title: "Article 1 (Parties)",
      body: `Advertiser: ${vars.advertiserLine ?? vars.clientCompany}`,
    },
    {
      title: "Article 2 (Media)",
      body:
        (vars.mediaLines?.length ?? 0) > 0
          ? vars.mediaLines!.map((m) => `· ${m}`)
          : "(See attachment)",
    },
    { title: "Article 3 (Period)", body: vars.period ?? `${vars.periodStart} - ${vars.periodEnd}` },
    { title: "Article 4 (Amount)", body: vars.amountLine ?? vars.totalAmount },
    {
      title: "Article 5 (Special terms)",
      body:
        vars.specialTerms?.trim() || OOH_CONTRACT_DEFAULT_SPECIAL_TERMS_EN,
    },
    { title: "Article 6 (General)", body: OOH_CONTRACT_GENERAL_TERMS_EN },
  ];

  for (const sec of sections) {
    y = ensurePageSpace(doc, y, 12);
    setContractFont(doc, fam, "bold");
    doc.text(sec.title, margin, y);
    y += 6;
    setContractFont(doc, fam, "normal");
    const lines = Array.isArray(sec.body) ? sec.body : [sec.body];
    for (const text of lines) {
      for (const line of wrapLines(doc, text, maxW)) {
        y = ensurePageSpace(doc, y, LINE_H);
        doc.text(line, margin, y);
        y += LINE_H;
      }
    }
    y += 4;
  }

  y += 6;
  if (options?.signaturePngBase64) {
    const raw = options.signaturePngBase64.includes(",")
      ? options.signaturePngBase64.split(",")[1]!
      : options.signaturePngBase64;
    try {
      const sigW = 56;
      const sigH = 22;
      const sigX = pageW - margin - sigW;
      y = ensurePageSpace(doc, y, sigH + 24);
      setContractFont(doc, fam, "bold");
      doc.text("Advertiser signature", margin, y);
      y += 6;
      doc.addImage(raw, "PNG", sigX, y - 4, sigW, sigH);
      y += sigH + 6;
    } catch {
      doc.text("(Signature image error)", margin, y);
      y += 8;
    }
  } else {
    doc.setDrawColor(180, 180, 180);
    doc.rect(pageW - margin - 60, y, 60, 22);
    setContractFont(doc, fam, "italic");
    doc.setFontSize(8);
    doc.text("Sign here", pageW - margin - 55, y + 13);
    doc.setFontSize(10);
    y += 28;
  }

  if (options?.audit) {
    y = ensurePageSpace(doc, y, 40);
    setContractFont(doc, fam, "bold");
    doc.setFontSize(9);
    doc.text("Electronic signature evidence", margin, y);
    y += 7;
    setContractFont(doc, fam, "normal");
    doc.setFontSize(7);
    const a = options.audit;
    for (const row of [
      `Document ID: ${a.documentNumber}`,
      `Signer: ${a.signerName} <${a.signerEmail}>`,
      `Signed at (KST): ${a.signedAtKst}`,
      `IP: ${a.signerIp}`,
    ]) {
      for (const line of wrapLines(doc, row, maxW)) {
        y = ensurePageSpace(doc, y, 3.5);
        doc.text(line, margin, y);
        y += 3.5;
      }
    }
  }

  const dataUri = doc.output("datauristring") as string;
  const i = dataUri.indexOf(",");
  const pdfBase64 = i >= 0 ? dataUri.slice(i + 1) : dataUri;
  const buf = Buffer.from(pdfBase64, "base64");
  const sha256 = createHash("sha256").update(buf).digest("hex");
  return { pdfBase64, sha256 };
}

export async function buildOohContractPdf(
  vars: OohContractPdfVars,
  options?: {
    signaturePngBase64?: string;
    audit?: OohContractSignAudit;
  },
): Promise<{ pdfBase64: string; sha256: string }> {
  if (vars.isKo) {
    return buildKoStandardContractPdf(vars, options);
  }
  return buildLegacyEnContractPdf(vars, options);
}

export async function buildSignedOohContractPdf(
  vars: OohContractPdfVars,
  signaturePngBase64: string,
  audit: OohContractSignAudit,
): Promise<{ pdfBase64: string; sha256: string }> {
  return buildOohContractPdf(vars, {
    signaturePngBase64,
    audit,
  });
}

import { createHash } from "node:crypto";
import {
  ensureKrFontForServerPdf,
  krFontFamily,
} from "@/lib/jspdf-register-noto-kr";
import {
  OOH_CONTRACT_DEFAULT_SPECIAL_TERMS_EN,
  OOH_CONTRACT_GENERAL_TERMS_EN,
} from "@/lib/ooh-contract-display";
import { loadQuoteStampDataUrl } from "@/lib/quote-pdf-assets";
import {
  buildOohContractKoTemplate,
  OOH_CONTRACT_PARTY_B_KO,
  type OohContractTemplateSection,
  type OohContractTemplateVars,
} from "@/lib/ooh-contract-template-ko";

export type OohContractPdfVars = {
  isKo: boolean;
  contractId: string;
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

/** THINKAD 브랜드 violet — 최종합계 등 절제된 포인트 강조용 */
const KO_ACCENT: [number, number, number] = [91, 33, 182];

/** KO 11조 PDF 레이아웃 (원문 문구는 템플릿 그대로) */
const KO_LAYOUT = {
  margin: 18,
  pageTop: 20,
  pageBottom: 279,
  bodyPt: 9.5,
  bodyLineH: 5.5,
  articleTitlePt: 11.5,
  preambleLineH: 5.5,
  articleGapBefore: 4,
  articleGapAfter: 2.5,
  paragraphGap: 2,
  titlePt: 16,
  titleGapAfter: 12,
  tableLabelW: 30,
  tableRowH: 7,
  tablePad: 2,
  tableFontPt: 9,
  tableTotalPt: 10,
  sigColGap: 6,
  sigBoxH: 46,
  sigFieldH: 6,
  sigDateGap: 7,
  sigBlockTopGap: 4,
} as const;

/** 짧은 조항만 페이지 하단에서 통째로 넘김 (과도한 빈 여백 방지) */
const KO_KEEP_TOGETHER_MAX_MM = 32;

const LINE_H = 5;

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
  if (y + need > KO_LAYOUT.pageBottom) {
    doc.addPage();
    return KO_LAYOUT.pageTop;
  }
  return y;
}

function isBlankSigField(value: string): boolean {
  const t = value.trim();
  return !t || t === "—" || t === "-";
}

function measureWrappedHeight(
  doc: import("jspdf").default,
  text: string,
  maxW: number,
  lineH: number,
): number {
  const lines = wrapLines(doc, text, maxW);
  return Math.max(lineH, lines.length * lineH);
}

function parseSummaryRow(line: string): { label: string; value: string } | null {
  const idx = line.indexOf(":");
  if (idx <= 0) return null;
  return {
    label: line.slice(0, idx).trim(),
    value: line.slice(idx + 1).trim(),
  };
}

/** 제N조 (제목) 접두 + 본문 분리 — 원문 텍스트 보존 */
function splitArticleLead(paragraph: string): {
  lead: string;
  rest: string;
} | null {
  const m = paragraph.match(
    /^(제\d+조\s*\([^)]+\)(?:\s*[··]\s*제\d+조\s*\([^)]+\))?)\s*(.*)$/s,
  );
  if (!m) return null;
  return { lead: m[1]!, rest: m[2]!.trim() };
}

type TextRunOpts = {
  bold?: boolean;
  size?: number;
  color?: [number, number, number];
  align?: "left" | "center";
};

type EmphasisRule = TextRunOpts & {
  pattern: RegExp;
};

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function mergeEmphasisMatches(
  line: string,
  rules: readonly EmphasisRule[],
): { start: number; end: number; opts: TextRunOpts }[] {
  const raw: { start: number; end: number; opts: TextRunOpts }[] = [];
  for (const rule of rules) {
    const flags = rule.pattern.flags.includes("g")
      ? rule.pattern.flags
      : `${rule.pattern.flags}g`;
    const re = new RegExp(rule.pattern.source, flags);
    for (const m of line.matchAll(re)) {
      if (m.index == null || !m[0]) continue;
      raw.push({
        start: m.index,
        end: m.index + m[0].length,
        opts: {
          bold: rule.bold,
          size: rule.size,
          color: rule.color,
        },
      });
    }
  }
  raw.sort((a, b) => a.start - b.start || b.end - a.end);
  const merged: typeof raw = [];
  for (const span of raw) {
    const last = merged[merged.length - 1];
    if (!last || span.start >= last.end) {
      merged.push(span);
      continue;
    }
    if (span.end > last.end) {
      merged.push({ start: last.end, end: span.end, opts: span.opts });
    }
  }
  return merged;
}

function drawTextRun(
  doc: import("jspdf").default,
  fam: string,
  x: number,
  y: number,
  text: string,
  opts: TextRunOpts,
): number {
  setContractFont(doc, fam, opts.bold ? "bold" : "normal");
  doc.setFontSize(opts.size ?? KO_LAYOUT.bodyPt);
  if (opts.color) doc.setTextColor(...opts.color);
  else doc.setTextColor(0, 0, 0);
  if (opts.align === "center") {
    doc.text(text, x, y, { align: "center" });
    return 0;
  }
  doc.text(text, x, y);
  return doc.getTextWidth(text);
}

function drawLineWithEmphasis(
  doc: import("jspdf").default,
  fam: string,
  x: number,
  y: number,
  line: string,
  rules: readonly EmphasisRule[],
  baseOpts?: TextRunOpts,
): void {
  const matches = mergeEmphasisMatches(line, rules);
  if (matches.length === 0) {
    drawTextRun(doc, fam, x, y, line, baseOpts ?? {});
    return;
  }
  let cursor = 0;
  let cx = x;
  for (const span of matches) {
    if (cursor < span.start) {
      cx += drawTextRun(doc, fam, cx, y, line.slice(cursor, span.start), baseOpts ?? {});
    }
    cx += drawTextRun(doc, fam, cx, y, line.slice(span.start, span.end), {
      ...(baseOpts ?? {}),
      ...span.opts,
      bold: span.opts.bold ?? baseOpts?.bold,
    });
    cursor = span.end;
  }
  if (cursor < line.length) {
    drawTextRun(doc, fam, cx, y, line.slice(cursor), baseOpts ?? {});
  }
}

function emphasisRulesForSection(
  heading: string,
  vars: OohContractPdfVars,
): EmphasisRule[] {
  if (heading.startsWith("제3조")) {
    const rules: EmphasisRule[] = [];
    if (vars.amountKorean.trim()) {
      rules.push({
        pattern: new RegExp(escapeRegExp(vars.amountKorean)),
        bold: true,
      });
    }
    if (vars.totalAmount.trim()) {
      rules.push({
        pattern: new RegExp(escapeRegExp(vars.totalAmount)),
        bold: true,
        size: KO_LAYOUT.bodyPt + 0.5,
      });
    }
    return rules;
  }
  if (heading.startsWith("제4조")) {
    return [{ pattern: /제\s*1조\s*계약\s*기간/, bold: true }];
  }
  if (heading.startsWith("제7조")) {
    return [{ pattern: /50%|100%/g, bold: true }];
  }
  return [];
}

function tableValueStyle(label: string): TextRunOpts {
  if (label.includes("최종합계")) {
    return { bold: true, size: KO_LAYOUT.tableTotalPt, color: KO_ACCENT };
  }
  if (label.includes("광고기간")) {
    return { bold: true, size: KO_LAYOUT.tableFontPt };
  }
  return { size: KO_LAYOUT.tableFontPt };
}

function drawArticleLeadParagraph(
  doc: import("jspdf").default,
  fam: string,
  paragraph: string,
  margin: number,
  maxW: number,
  yStart: number,
  emphasisRules: readonly EmphasisRule[] = [],
): number {
  const split = splitArticleLead(paragraph);
  let y = yStart;
  if (!split) {
    for (const line of wrapLines(doc, paragraph, maxW)) {
      y = ensurePageSpace(doc, y, KO_LAYOUT.bodyLineH);
      drawLineWithEmphasis(doc, fam, margin, y, line, emphasisRules);
      y += KO_LAYOUT.bodyLineH;
    }
    return y;
  }

  y = ensurePageSpace(doc, y, KO_LAYOUT.bodyLineH);
  let x = margin;
  x += drawTextRun(doc, fam, x, y, `${split.lead} `, {
    bold: true,
    size: KO_LAYOUT.articleTitlePt,
  });
  if (split.rest) {
    const restW = maxW - (x - margin);
    const restLines = wrapLines(doc, split.rest, restW);
    drawLineWithEmphasis(doc, fam, x, y, restLines[0] ?? "", emphasisRules);
    for (let i = 1; i < restLines.length; i++) {
      y += KO_LAYOUT.bodyLineH;
      y = ensurePageSpace(doc, y, KO_LAYOUT.bodyLineH);
      drawLineWithEmphasis(doc, fam, margin, y, restLines[i]!, emphasisRules);
    }
  }
  return y + KO_LAYOUT.bodyLineH;
}

function drawArticle1SummaryTable(
  doc: import("jspdf").default,
  fam: string,
  rows: readonly string[],
  margin: number,
  maxW: number,
  yStart: number,
): number {
  const parsed = rows
    .map(parseSummaryRow)
    .filter((r): r is { label: string; value: string } => r != null);
  if (parsed.length === 0) return yStart;

  const tableH = parsed.length * KO_LAYOUT.tableRowH;
  let y = ensurePageSpace(doc, yStart, tableH + 2);

  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.25);
  doc.rect(margin, y, maxW, tableH);

  const valueX = margin + KO_LAYOUT.tableLabelW;
  doc.line(valueX, y, valueX, y + tableH);

  for (let i = 0; i < parsed.length; i++) {
    const rowY = y + KO_LAYOUT.tableRowH * i;
    if (i > 0) {
      doc.line(margin, rowY, margin + maxW, rowY);
    }
    const row = parsed[i]!;
    const midY = rowY + KO_LAYOUT.tableRowH * 0.68;
    const valueStyle = tableValueStyle(row.label);
    drawTextRun(doc, fam, margin + KO_LAYOUT.tablePad, midY, row.label, {
      bold: true,
      size: KO_LAYOUT.tableFontPt,
    });
    const valueLines = wrapLines(
      doc,
      row.value,
      maxW - KO_LAYOUT.tableLabelW - KO_LAYOUT.tablePad * 2,
    );
    drawTextRun(
      doc,
      fam,
      valueX + KO_LAYOUT.tablePad,
      midY,
      valueLines[0] ?? "",
      valueStyle,
    );
  }

  return y + tableH + KO_LAYOUT.paragraphGap;
}

function estimateArticleHeight(
  doc: import("jspdf").default,
  section: OohContractTemplateSection,
  maxW: number,
): number {
  const paras = section.paragraphs.filter((p) => p.trim());
  if (paras.length === 0) return KO_LAYOUT.articleGapBefore;

  let h = KO_LAYOUT.articleGapBefore + KO_LAYOUT.bodyLineH + KO_LAYOUT.paragraphGap;
  const isArt1 = section.heading.startsWith("제1조");

  if (isArt1 && paras.length > 1) {
    h += measureWrappedHeight(doc, paras[0]!, maxW, KO_LAYOUT.bodyLineH);
    h += paras.length * KO_LAYOUT.tableRowH + KO_LAYOUT.paragraphGap;
    return h + KO_LAYOUT.articleGapAfter;
  }

  for (const para of paras) {
    h +=
      measureWrappedHeight(doc, para, maxW, KO_LAYOUT.bodyLineH) +
      KO_LAYOUT.paragraphGap;
  }
  return h + KO_LAYOUT.articleGapAfter;
}

function renderKoArticleSection(
  doc: import("jspdf").default,
  fam: string,
  section: OohContractTemplateSection,
  margin: number,
  maxW: number,
  yStart: number,
  vars: OohContractPdfVars,
): number {
  const paras = section.paragraphs.filter((p) => p.trim());
  if (paras.length === 0) return yStart;

  const est = estimateArticleHeight(doc, section, maxW);
  let y = yStart;
  if (
    est <= KO_KEEP_TOGETHER_MAX_MM &&
    y + est > KO_LAYOUT.pageBottom
  ) {
    doc.addPage();
    y = KO_LAYOUT.pageTop;
  }

  y += KO_LAYOUT.articleGapBefore;
  const emphasis = emphasisRulesForSection(section.heading, vars);

  const isArt1 = section.heading.startsWith("제1조");
  if (isArt1 && paras.length > 1) {
    y = drawArticleLeadParagraph(doc, fam, paras[0]!, margin, maxW, y, emphasis);
    y += KO_LAYOUT.paragraphGap;
    y = drawArticle1SummaryTable(doc, fam, paras.slice(1), margin, maxW, y);
    return y + KO_LAYOUT.articleGapAfter;
  }

  for (const para of paras) {
    y = drawArticleLeadParagraph(doc, fam, para, margin, maxW, y, emphasis);
    y += KO_LAYOUT.paragraphGap;
  }
  return y + KO_LAYOUT.articleGapAfter;
}

function drawSigFieldRow(
  doc: import("jspdf").default,
  fam: string,
  x: number,
  y: number,
  width: number,
  label: string,
  value: string,
): number {
  const labelText = `${label} :`;
  drawTextRun(doc, fam, x, y, labelText, { size: 9 });
  const valX = x + doc.getTextWidth(`${labelText} `);
  const valW = width - (valX - x) - 2;

  if (isBlankSigField(value)) {
    doc.setDrawColor(100, 100, 100);
    doc.setLineWidth(0.35);
    doc.line(valX, y + 0.9, valX + valW, y + 0.9);
  } else {
    const lines = wrapLines(doc, value.trim(), valW);
    drawTextRun(doc, fam, valX, y, lines[0] ?? "", { size: 9 });
  }
  return y + KO_LAYOUT.sigFieldH;
}

function drawPartyStamp(
  doc: import("jspdf").default,
  fam: string,
  stampDataUrl: string | null,
  cx: number,
  cy: number,
) {
  const stampSize = 24;
  if (stampDataUrl) {
    try {
      doc.addImage(
        stampDataUrl,
        "PNG",
        cx - stampSize / 2,
        cy - stampSize / 2,
        stampSize,
        stampSize,
        undefined,
        "FAST",
        -3,
      );
      return;
    } catch {
      /* fallback below */
    }
  }
  doc.setDrawColor(160, 160, 160);
  doc.setLineWidth(0.4);
  doc.circle(cx, cy, stampSize / 2 - 1);
  drawTextRun(doc, fam, cx, cy + 1.5, "(인)", {
    size: 8,
    color: [80, 80, 80],
    align: "center",
  });
}

function renderKoSignatureBlock(
  doc: import("jspdf").default,
  fam: string,
  vars: OohContractPdfVars,
  margin: number,
  pageW: number,
  yStart: number,
  options?: { signaturePngBase64?: string },
): number {
  const partyB = OOH_CONTRACT_PARTY_B_KO;
  const maxW = pageW - 2 * margin;
  const colW = (maxW - KO_LAYOUT.sigColGap) / 2;
  const leftX = margin;
  const rightX = margin + colW + KO_LAYOUT.sigColGap;
  const blockH = KO_LAYOUT.sigBoxH + 20;

  let y = ensurePageSpace(doc, yStart, blockH);
  y += KO_LAYOUT.sigBlockTopGap;

  drawTextRun(doc, fam, pageW / 2, y, vars.contractDate, {
    size: 10.5,
    bold: true,
    align: "center",
  });
  y += KO_LAYOUT.sigDateGap;

  y = ensurePageSpace(doc, y, KO_LAYOUT.sigBoxH + 4);
  const boxTop = y;

  doc.setDrawColor(190, 190, 190);
  doc.setLineWidth(0.3);
  doc.rect(leftX, boxTop, colW, KO_LAYOUT.sigBoxH);
  doc.rect(rightX, boxTop, colW, KO_LAYOUT.sigBoxH);

  drawTextRun(doc, fam, leftX + 3, boxTop + 5, '"갑"', { bold: true, size: 9.5 });
  drawTextRun(doc, fam, rightX + 3, boxTop + 5, '"을"', { bold: true, size: 9.5 });

  let ly = boxTop + 10;
  ly = drawSigFieldRow(doc, fam, leftX + 3, ly, colW - 6, "상호", vars.clientCompany);
  ly = drawSigFieldRow(doc, fam, leftX + 3, ly, colW - 6, "주소", vars.clientAddress);
  ly = drawSigFieldRow(doc, fam, leftX + 3, ly, colW - 6, "전화번호", vars.clientPhone);
  ly = drawSigFieldRow(
    doc,
    fam,
    leftX + 3,
    ly,
    colW - 6,
    "대표이사",
    vars.clientRepName,
  );

  let ry = boxTop + 10;
  drawTextRun(doc, fam, rightX + 3, ry, `상호 : ${partyB.companyName}`, {
    size: 8.5,
  });
  ry += KO_LAYOUT.sigFieldH;
  drawTextRun(doc, fam, rightX + 3, ry, `주소 : ${partyB.address}`, { size: 8.5 });
  ry += KO_LAYOUT.sigFieldH;
  drawTextRun(doc, fam, rightX + 3, ry, `전화번호 : ${partyB.tel}`, { size: 8.5 });
  ry += KO_LAYOUT.sigFieldH;
  drawTextRun(
    doc,
    fam,
    rightX + 3,
    ry,
    `대표이사 : ${partyB.representative}`,
    { size: 8.5 },
  );

  const sigW = 46;
  const sigH = 18;
  const sigX = leftX + colW - sigW - 5;
  const sigY = boxTop + KO_LAYOUT.sigBoxH - sigH - 4;

  if (options?.signaturePngBase64) {
    const raw = options.signaturePngBase64.includes(",")
      ? options.signaturePngBase64.split(",")[1]!
      : options.signaturePngBase64;
    try {
      doc.addImage(raw, "PNG", sigX, sigY, sigW, sigH);
    } catch {
      drawTextRun(doc, fam, leftX + 4, sigY + 10, "(서명 이미지 처리 오류)", {
        size: 8,
      });
    }
  } else {
    doc.setDrawColor(180, 180, 180);
    doc.rect(sigX, sigY, sigW, sigH);
    drawTextRun(doc, fam, sigX + 14, sigY + 12, "(인)", {
      size: 8,
      color: [100, 100, 100],
    });
  }

  const stampCx = rightX + colW - 14;
  const stampCy = boxTop + KO_LAYOUT.sigBoxH - 12;
  drawPartyStamp(doc, fam, loadQuoteStampDataUrl(), stampCx, stampCy);

  return boxTop + KO_LAYOUT.sigBoxH + 6;
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
  const margin = KO_LAYOUT.margin;
  const pageW = doc.internal.pageSize.getWidth();
  const maxW = pageW - 2 * margin;

  const hasKr = await ensureKrFontForServerPdf(doc);
  const fam = krFontFamily(hasKr);

  const template = buildOohContractKoTemplate(pdfVarsToTemplateVars(vars));
  let y = KO_LAYOUT.pageTop;

  for (const section of template.sections) {
    if (section.kind === "title") {
      y = ensurePageSpace(doc, y, KO_LAYOUT.titleGapAfter + 4);
      drawTextRun(doc, fam, pageW / 2, y, section.heading, {
        bold: true,
        size: KO_LAYOUT.titlePt,
        color: [15, 23, 42],
        align: "center",
      });
      y += KO_LAYOUT.titleGapAfter;
      continue;
    }

    if (section.kind === "signature") {
      y = renderKoSignatureBlock(doc, fam, vars, margin, pageW, y, {
        signaturePngBase64: options?.signaturePngBase64,
      });
      continue;
    }

    if (section.kind === "preamble") {
      for (const para of section.paragraphs) {
        if (!para.trim()) continue;
        for (const line of wrapLines(doc, para, maxW)) {
          y = ensurePageSpace(doc, y, KO_LAYOUT.preambleLineH);
          drawTextRun(doc, fam, margin, y, line, { size: KO_LAYOUT.bodyPt });
          y += KO_LAYOUT.preambleLineH;
        }
        y += KO_LAYOUT.paragraphGap;
      }
      y += 1;
      continue;
    }

    if (section.kind === "article") {
      y = renderKoArticleSection(doc, fam, section, margin, maxW, y, vars);
    }
  }

  if (options?.audit) {
    y = ensurePageSpace(doc, y, 40);
    drawTextRun(doc, fam, margin, y, "전자서명 증거 기록", {
      bold: true,
      size: 9,
      color: [15, 23, 42],
    });
    y += 7;

    doc.setFontSize(7);
    doc.setTextColor(50, 50, 50);
    setContractFont(doc, fam, "normal");
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
        y = ensurePageSpace(doc, y, 3.8);
        doc.text(line, margin, y);
        y += 3.8;
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
  const pageBottom = 275;

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
    {
      title: "Article 3 (Period)",
      body: vars.period ?? `${vars.periodStart} - ${vars.periodEnd}`,
    },
    { title: "Article 4 (Amount)", body: vars.amountLine ?? vars.totalAmount },
    {
      title: "Article 5 (Special terms)",
      body:
        vars.specialTerms?.trim() || OOH_CONTRACT_DEFAULT_SPECIAL_TERMS_EN,
    },
    { title: "Article 6 (General)", body: OOH_CONTRACT_GENERAL_TERMS_EN },
  ];

  for (const sec of sections) {
    if (y + 12 > pageBottom) {
      doc.addPage();
      y = 18;
    }
    setContractFont(doc, fam, "bold");
    doc.text(sec.title, margin, y);
    y += 6;
    setContractFont(doc, fam, "normal");
    const lines = Array.isArray(sec.body) ? sec.body : [sec.body];
    for (const text of lines) {
      for (const line of wrapLines(doc, text, maxW)) {
        if (y + LINE_H > pageBottom) {
          doc.addPage();
          y = 18;
        }
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
      if (y + sigH + 24 > pageBottom) {
        doc.addPage();
        y = 18;
      }
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
    if (y + 40 > pageBottom) {
      doc.addPage();
      y = 18;
    }
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
        if (y + 3.5 > pageBottom) {
          doc.addPage();
          y = 18;
        }
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

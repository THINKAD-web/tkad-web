import { createHash } from "node:crypto";
import {
  ensureKrFontForServerPdf,
  krFontFamily,
} from "@/lib/jspdf-register-noto-kr";
import {
  OOH_CONTRACT_DEFAULT_SPECIAL_TERMS_EN,
  OOH_CONTRACT_GENERAL_TERMS_EN,
} from "@/lib/ooh-contract-display";
import { resolveQuoteStampDataUrl } from "@/lib/quote-pdf-assets";
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
  tableValueLineH: 4.2,
  tablePad: 2,
  tableBorderPt: 0.35,
  tableFontPt: 9,
  tableTotalPt: 10,
  articleMidGap: 3,
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

/** 장문 조항 본문을 항(1) 2))·(1) (2) 경계로 분할 — 원문 문자열 변경 없음 */
export function splitArticleBodyAtItemBoundaries(body: string): string[] {
  const trimmed = body.trim();
  if (!trimmed) return [];
  const chunks = trimmed
    .split(/(?= \d+\) )|(?= \(\d+\) )/)
    .map((s) => s.trim())
    .filter(Boolean);
  return chunks.length > 1 ? chunks : [trimmed];
}

/** 제10·11 단일 단락을 PDF 렌더용 2조각으로 분리 — 템플릿 원문은 그대로 */
export function splitArt10And11ForRender(paragraph: string): string[] {
  const marker = "제11조 (효력발생)";
  const idx = paragraph.indexOf(marker);
  if (idx <= 0) return [paragraph];
  return [paragraph.slice(0, idx).trimEnd(), paragraph.slice(idx).trim()];
}

function articleParagraphsForRender(
  section: OohContractTemplateSection,
): string[] {
  const paras = section.paragraphs.filter((p) => p.trim());
  if (
    section.heading.includes("제10조") &&
    section.heading.includes("제11조")
  ) {
    return paras.flatMap((p) => splitArt10And11ForRender(p));
  }
  return paras;
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
    return [
      { pattern: /50%|100%/g, bold: true },
      { pattern: /위약금|일시불/g, bold: true },
    ];
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

function drawWrappedParagraphLines(
  doc: import("jspdf").default,
  fam: string,
  text: string,
  margin: number,
  maxW: number,
  yStart: number,
  emphasisRules: readonly EmphasisRule[] = [],
): number {
  let y = yStart;
  for (const line of wrapLines(doc, text, maxW)) {
    y = ensurePageSpace(doc, y, KO_LAYOUT.bodyLineH);
    drawLineWithEmphasis(doc, fam, margin, y, line, emphasisRules);
    y += KO_LAYOUT.bodyLineH;
  }
  return y;
}

/** 제1조: 조항 제목 단독 행 + 본문(계약일로부터…) 분리 */
function drawArticleTitleSeparatedBody(
  doc: import("jspdf").default,
  fam: string,
  lead: string,
  body: string,
  margin: number,
  maxW: number,
  yStart: number,
  emphasisRules: readonly EmphasisRule[] = [],
): number {
  let y = ensurePageSpace(doc, yStart, KO_LAYOUT.bodyLineH * 2);
  drawTextRun(doc, fam, margin, y, lead, {
    bold: true,
    size: KO_LAYOUT.articleTitlePt,
  });
  y += KO_LAYOUT.bodyLineH;
  if (body.trim()) {
    y = drawWrappedParagraphLines(
      doc,
      fam,
      body,
      margin,
      maxW,
      y,
      emphasisRules,
    );
  }
  return y;
}

function drawArticleLeadParagraph(
  doc: import("jspdf").default,
  fam: string,
  paragraph: string,
  margin: number,
  maxW: number,
  yStart: number,
  emphasisRules: readonly EmphasisRule[] = [],
  options?: { titleOnOwnLine?: boolean },
): number {
  const split = splitArticleLead(paragraph);
  let y = yStart;
  if (!split) {
    return drawWrappedParagraphLines(
      doc,
      fam,
      paragraph,
      margin,
      maxW,
      y,
      emphasisRules,
    );
  }

  if (options?.titleOnOwnLine) {
    return drawArticleTitleSeparatedBody(
      doc,
      fam,
      split.lead,
      split.rest,
      margin,
      maxW,
      y,
      emphasisRules,
    );
  }

  const bodyChunks = splitArticleBodyAtItemBoundaries(split.rest);
  if (bodyChunks.length > 1) {
    return drawArticleBodyChunks(
      doc,
      fam,
      split.lead,
      bodyChunks,
      margin,
      maxW,
      y,
      emphasisRules,
    );
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

/** 장문 조항: 항 경계 단위 페이지 넘김 + 이어짐 표시 */
function drawArticleBodyChunks(
  doc: import("jspdf").default,
  fam: string,
  lead: string,
  chunks: readonly string[],
  margin: number,
  maxW: number,
  yStart: number,
  emphasisRules: readonly EmphasisRule[] = [],
): number {
  let y = yStart;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]!;
    const isFirst = i === 0;
    const continuationLabel = `${lead} — 계속`;

    if (isFirst) {
      const firstText = `${lead} ${chunk}`;
      const chunkH = measureWrappedHeight(doc, firstText, maxW, KO_LAYOUT.bodyLineH);
      y = ensurePageSpace(doc, y, chunkH);
      y = drawArticleLeadParagraph(
        doc,
        fam,
        firstText,
        margin,
        maxW,
        y,
        emphasisRules,
      );
      continue;
    }

    const chunkH = measureWrappedHeight(doc, chunk, maxW, KO_LAYOUT.bodyLineH);
    const needH = KO_LAYOUT.bodyLineH + chunkH;
    const pageBefore = doc.getNumberOfPages();
    y = ensurePageSpace(doc, y, needH);
    const pageAfter = doc.getNumberOfPages();
    if (pageAfter > pageBefore || y <= KO_LAYOUT.pageTop + 0.5) {
      y = ensurePageSpace(doc, y, KO_LAYOUT.bodyLineH);
      drawTextRun(doc, fam, margin, y, continuationLabel, {
        bold: true,
        size: KO_LAYOUT.articleTitlePt - 0.5,
      });
      y += KO_LAYOUT.bodyLineH;
    }

    y = drawWrappedParagraphLines(
      doc,
      fam,
      chunk,
      margin,
      maxW,
      y,
      emphasisRules,
    );
  }

  return y;
}

function measureTableRowHeight(
  doc: import("jspdf").default,
  label: string,
  value: string,
  maxW: number,
): number {
  const valueW = maxW - KO_LAYOUT.tableLabelW - KO_LAYOUT.tablePad * 2;
  const labelW = KO_LAYOUT.tableLabelW - KO_LAYOUT.tablePad * 2;
  const valueLines = wrapLines(doc, value, valueW).length;
  const labelLines = wrapLines(doc, label, labelW).length;
  const lines = Math.max(valueLines, labelLines, 1);
  return Math.max(
    KO_LAYOUT.tableRowH,
    KO_LAYOUT.tablePad * 2 + lines * KO_LAYOUT.tableValueLineH,
  );
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

  const valueW = maxW - KO_LAYOUT.tableLabelW - KO_LAYOUT.tablePad * 2;
  const labelW = KO_LAYOUT.tableLabelW - KO_LAYOUT.tablePad * 2;
  const rowHeights = parsed.map((row) =>
    measureTableRowHeight(doc, row.label, row.value, maxW),
  );
  const tableH = rowHeights.reduce((sum, h) => sum + h, 0);
  let y = ensurePageSpace(doc, yStart, tableH + 2);

  doc.setDrawColor(170, 170, 170);
  doc.setLineWidth(KO_LAYOUT.tableBorderPt);
  doc.rect(margin, y, maxW, tableH);

  const valueX = margin + KO_LAYOUT.tableLabelW;
  doc.line(valueX, y, valueX, y + tableH);

  let rowY = y;
  for (let i = 0; i < parsed.length; i++) {
    const rowH = rowHeights[i]!;
    if (i > 0) {
      doc.line(margin, rowY, margin + maxW, rowY);
    }
    const row = parsed[i]!;
    const valueStyle = tableValueStyle(row.label);
    const labelLines = wrapLines(doc, row.label, labelW);
    const valueLines = wrapLines(doc, row.value, valueW);
    const textTop = rowY + KO_LAYOUT.tablePad + KO_LAYOUT.tableValueLineH * 0.85;

    labelLines.forEach((line, li) => {
      drawTextRun(
        doc,
        fam,
        margin + KO_LAYOUT.tablePad,
        textTop + li * KO_LAYOUT.tableValueLineH,
        line,
        { bold: true, size: KO_LAYOUT.tableFontPt },
      );
    });
    valueLines.forEach((line, li) => {
      drawTextRun(
        doc,
        fam,
        valueX + KO_LAYOUT.tablePad,
        textTop + li * KO_LAYOUT.tableValueLineH,
        line,
        valueStyle,
      );
    });
    rowY += rowH;
  }

  return y + tableH + KO_LAYOUT.paragraphGap;
}

function estimateParagraphRenderHeight(
  doc: import("jspdf").default,
  paragraph: string,
  maxW: number,
  options?: { titleOnOwnLine?: boolean },
): number {
  const split = splitArticleLead(paragraph);
  if (!split) {
    return measureWrappedHeight(doc, paragraph, maxW, KO_LAYOUT.bodyLineH);
  }

  if (options?.titleOnOwnLine) {
    let h = KO_LAYOUT.bodyLineH;
    if (split.rest.trim()) {
      h += measureWrappedHeight(doc, split.rest, maxW, KO_LAYOUT.bodyLineH);
    }
    return h;
  }

  const chunks = splitArticleBodyAtItemBoundaries(split.rest);
  if (chunks.length > 1) {
    let h = 0;
    const firstText = `${split.lead} ${chunks[0]!}`;
    h += measureWrappedHeight(doc, firstText, maxW, KO_LAYOUT.bodyLineH);
    for (let i = 1; i < chunks.length; i++) {
      h += KO_LAYOUT.bodyLineH + KO_LAYOUT.paragraphGap;
      h += measureWrappedHeight(doc, chunks[i]!, maxW, KO_LAYOUT.bodyLineH);
    }
    return h;
  }

  const full = split.rest ? `${split.lead} ${split.rest}` : split.lead;
  return measureWrappedHeight(doc, full, maxW, KO_LAYOUT.bodyLineH);
}

function estimateArticleHeight(
  doc: import("jspdf").default,
  section: OohContractTemplateSection,
  maxW: number,
): number {
  const paras = articleParagraphsForRender(section).filter((p) => p.trim());
  if (paras.length === 0) return KO_LAYOUT.articleGapBefore;

  let h = KO_LAYOUT.articleGapBefore + KO_LAYOUT.paragraphGap;
  const isArt1 = section.heading.startsWith("제1조");

  if (isArt1 && section.paragraphs.filter((p) => p.trim()).length > 1) {
    const leadPara = section.paragraphs.filter((p) => p.trim())[0]!;
    h += estimateParagraphRenderHeight(doc, leadPara, maxW, {
      titleOnOwnLine: true,
    });
    const tableRows = section.paragraphs.filter((p) => p.trim()).slice(1);
    for (const row of tableRows) {
      const parsed = parseSummaryRow(row);
      if (!parsed) continue;
      h += measureTableRowHeight(doc, parsed.label, parsed.value, maxW);
    }
    h += KO_LAYOUT.paragraphGap;
    return h + KO_LAYOUT.articleGapAfter;
  }

  for (let i = 0; i < paras.length; i++) {
    h +=
      estimateParagraphRenderHeight(doc, paras[i]!, maxW) +
      KO_LAYOUT.paragraphGap;
    if (
      section.heading.includes("제10조") &&
      section.heading.includes("제11조") &&
      i === 0 &&
      paras.length > 1
    ) {
      h += KO_LAYOUT.articleMidGap;
    }
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
  const rawParas = section.paragraphs.filter((p) => p.trim());
  if (rawParas.length === 0) return yStart;

  const est = estimateArticleHeight(doc, section, maxW);
  let y = yStart;
  if (est <= KO_KEEP_TOGETHER_MAX_MM && y + est > KO_LAYOUT.pageBottom) {
    doc.addPage();
    y = KO_LAYOUT.pageTop;
  }

  y += KO_LAYOUT.articleGapBefore;
  const emphasis = emphasisRulesForSection(section.heading, vars);

  const isArt1 = section.heading.startsWith("제1조");
  if (isArt1 && rawParas.length > 1) {
    y = drawArticleLeadParagraph(
      doc,
      fam,
      rawParas[0]!,
      margin,
      maxW,
      y,
      emphasis,
      { titleOnOwnLine: true },
    );
    y += KO_LAYOUT.paragraphGap;
    y = drawArticle1SummaryTable(doc, fam, rawParas.slice(1), margin, maxW, y);
    return y + KO_LAYOUT.articleGapAfter;
  }

  const paras = articleParagraphsForRender(section);
  const isArt10And11 =
    section.heading.includes("제10조") && section.heading.includes("제11조");

  for (let i = 0; i < paras.length; i++) {
    y = drawArticleLeadParagraph(doc, fam, paras[i]!, margin, maxW, y, emphasis);
    y += KO_LAYOUT.paragraphGap;
    if (isArt10And11 && i === 0 && paras.length > 1) {
      y += KO_LAYOUT.articleMidGap;
    }
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

function drawSignaturePlaceholder(
  doc: import("jspdf").default,
  fam: string,
  cx: number,
  cy: number,
) {
  const sigW = 46;
  const sigH = 18;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.35);
  doc.rect(cx - sigW / 2, cy - sigH / 2, sigW, sigH);
  drawTextRun(doc, fam, cx, cy + 1.5, "(서명)", {
    size: 8,
    color: [100, 100, 100],
    align: "center",
  });
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
  options?: { signaturePngBase64?: string; stampDataUrl?: string | null },
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
  ry = drawSigFieldRow(doc, fam, rightX + 3, ry, colW - 6, "상호", partyB.companyName);
  ry = drawSigFieldRow(doc, fam, rightX + 3, ry, colW - 6, "주소", partyB.address);
  ry = drawSigFieldRow(doc, fam, rightX + 3, ry, colW - 6, "전화번호", partyB.tel);
  ry = drawSigFieldRow(
    doc,
    fam,
    rightX + 3,
    ry,
    colW - 6,
    "대표이사",
    partyB.representative,
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
    drawSignaturePlaceholder(doc, fam, sigX + sigW / 2, sigY + sigH / 2);
  }

  const stampCx = rightX + colW - 14;
  const stampCy = boxTop + KO_LAYOUT.sigBoxH - 12;
  drawPartyStamp(doc, fam, options?.stampDataUrl ?? null, stampCx, stampCy);

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
  const stampDataUrl = await resolveQuoteStampDataUrl();

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
        stampDataUrl,
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

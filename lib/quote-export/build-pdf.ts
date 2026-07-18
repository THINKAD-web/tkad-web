import type { jsPDF } from "jspdf";
import { registerNotoSansKrIfAvailable } from "@/lib/jspdf-register-noto-kr";
import { krFontFamily } from "@/lib/jspdf-kr-font-constants";
import { formatDocumentManWon, truncateDocText } from "@/lib/document-text";
import {
  addPdfThumbImage,
  EXPORT_THUMB_BOX_MM,
  loadExportThumbMap,
} from "@/lib/export-media-images";
import { resolveQuoteStampDataUrl } from "@/lib/quote-pdf-assets";
import type { QuoteExportPayload } from "@/lib/quote-export/types";
import { formatCampaignDurationMeta } from "@/lib/quote-campaign-period";
import { isQuoteAddonLineId } from "@/lib/quote-addon-line";

/** Quiet Professional — 흑백 + 주황 단일 액센트 (#ff6200) */
const ACCENT = [255, 98, 0] as const;
const ACCENT_DK = [194, 78, 0] as const;
const ACCENT_SOFT = [255, 243, 232] as const;
const INK = [17, 24, 39] as const;
const INK_STRONG = [28, 28, 31] as const;
const GRAY_600 = [75, 85, 99] as const;
const GRAY_500 = [107, 114, 128] as const;
const GRAY_200 = [228, 230, 236] as const;
const GRAY_50 = [248, 249, 251] as const;
const DARK_BG = [10, 10, 12] as const;
const DARK_CARD = [28, 28, 31] as const;
const WHITE = [255, 255, 255] as const;
/** qp 각진 카드 — roundedRect radius mm */
const R = 0;

const M = 15;
const HERO_H = 44;
const BASIC_HERO_H = 44;
const BASIC_SECTION_TITLE_W = 26;
const BASIC_COMPACT_MEDIA_MIN = 5;
const QUOTE_BASIC_THUMB_MM = { w: 28, h: 21 } as const;
const RED_700 = [185, 28, 28] as const;

/** 직인: 로컬 public/brand → 원격 URL 순. 없으면 생략 (가짜 도장 미표시). */
async function resolveStampDataUrl(url?: string): Promise<string | null> {
  return resolveQuoteStampDataUrl(url);
}

async function drawStamp(
  doc: jsPDF,
  _font: string,
  p: QuoteExportPayload,
  cx: number,
  cy: number,
) {
  const data = await resolveStampDataUrl(p.stampUrl);
  if (!data) return;
  try {
    doc.addImage(data, "PNG", cx - 13, cy - 13, 26, 26, undefined, "FAST", -3);
  } catch {
    /* stamp optional */
  }
}

function drawWordmark(
  doc: jsPDF,
  font: string,
  x: number,
  baseY: number,
  size: number,
  onDark: boolean,
) {
  doc.setFont(font, "normal");
  doc.setFontSize(size);
  doc.setTextColor(onDark ? 255 : INK[0], onDark ? 255 : INK[1], onDark ? 255 : INK[2]);
  doc.text("THINK", x, baseY);
  const w = doc.getTextWidth("THINK");
  doc.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2]);
  doc.text("AD", x + w, baseY);
}

function sectionTitle(doc: jsPDF, font: string, label: string, y: number): number {
  doc.setFont(font, "normal");
  doc.setFontSize(11);
  doc.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2]);
  doc.rect(M, y, 1.6, 5.2, "F");
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.text(label, M + 4, y + 4.6);
  return y + 9;
}

function drawQuoteHero(
  doc: jsPDF,
  font: string,
  p: QuoteExportPayload,
  pageW: number,
  badge: string,
  title: string,
): number {
  doc.setFillColor(INK_STRONG[0], INK_STRONG[1], INK_STRONG[2]);
  doc.rect(0, 0, pageW, HERO_H, "F");
  doc.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2]);
  doc.rect(0, HERO_H, pageW, 1.2, "F");

  drawWordmark(doc, font, M, 14, 14, true);
  doc.setFontSize(7.5);
  doc.setTextColor(229, 231, 235);
  doc.text(badge, pageW - M, 14, { align: "right" });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text(title, M, 28);
  doc.setFontSize(9);
  doc.setTextColor(209, 213, 219);
  const sub = `${p.periodLabel} · ${p.issuedAt}`;
  doc.text(sub, M, 36);
  doc.setFontSize(8);
  doc.text(`No. ${p.quoteNo}`, pageW - M, 36, { align: "right" });
  doc.text(`${p.isKo ? "유효" : "Valid"} ${p.validUntil}`, pageW - M, 41, { align: "right" });

  return HERO_H + 6;
}

function drawPdfThumbOrPlaceholder(
  doc: jsPDF,
  thumb: string | undefined,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  isKo: boolean,
) {
  doc.setFillColor(248, 249, 252);
  doc.setDrawColor(GRAY_200[0], GRAY_200[1], GRAY_200[2]);
  doc.setLineWidth(0.15);
  doc.roundedRect(boxX, boxY, boxW, boxH, R, R, "FD");
  if (thumb) {
    addPdfThumbImage(doc, thumb, boxX, boxY, boxW, boxH);
    return;
  }
  doc.setFontSize(5.5);
  doc.setTextColor(GRAY_500[0], GRAY_500[1], GRAY_500[2]);
  doc.text(
    isKo ? "이미지 없음" : "No image",
    boxX + boxW / 2,
    boxY + boxH / 2 + 1,
    { align: "center" },
  );
}

function quoteExportProrationSpecLine(
  line: QuoteExportPayload["lines"][number],
): string | null {
  return line.prorationLabel?.trim() ? line.prorationLabel.trim() : null;
}

/** 기본 견적서 매체 카드 — 플래너 톤·압축 레이아웃 (premium 은 drawMediaCards 유지) */
function basicDrawQuoteMediaCards(
  doc: jsPDF,
  font: string,
  p: QuoteExportPayload,
  x: number,
  yStart: number,
  w: number,
  pageH: number,
  thumbs: Map<string, string>,
): number {
  const isKo = p.isKo;
  let y = yStart;
  const thumbW = QUOTE_BASIC_THUMB_MM.w;
  const thumbH = QUOTE_BASIC_THUMB_MM.h;
  const gap = 1.5;

  if (p.lines.length === 0) {
    doc.setFontSize(9);
    doc.setTextColor(GRAY_500[0], GRAY_500[1], GRAY_500[2]);
    doc.text(isKo ? "선택된 매체가 없습니다." : "No media selected.", x + 2, y + 5);
    return y + 10;
  }

  for (const line of p.lines) {
    const isAddon = isQuoteAddonLineId(line.mediaId);
    const prorationSpec = quoteExportProrationSpecLine(line);
    const cardH = prorationSpec ? 24 : 20;

    if (y + cardH > pageH - 30) {
      doc.addPage();
      y = M;
    }

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(GRAY_200[0], GRAY_200[1], GRAY_200[2]);
    doc.setLineWidth(0.2);
    if (isAddon) {
      doc.setLineDashPattern([1.2, 1.2], 0);
    }
    doc.roundedRect(x, y, w, cardH, R, R, isAddon ? "D" : "FD");
    if (isAddon) {
      doc.setLineDashPattern([], 0);
    }

    const priceX = x + w - 3;
    const textX = x + 2 + thumbW + 3;
    const textW = w - thumbW - 38;
    const unitVal = formatDocumentManWon(line.unitPriceWon, isKo);
    const subVal = formatDocumentManWon(line.lineSupplyWon, isKo);

    if (isAddon) {
      doc.setFont(font, "normal");
      doc.setFontSize(10);
      doc.setTextColor(INK[0], INK[1], INK[2]);
      doc.text(
        (doc.splitTextToSize(line.name, textW) as string[]).slice(0, 1),
        textX,
        y + 10,
      );
      doc.setFontSize(6);
      doc.setTextColor(GRAY_500[0], GRAY_500[1], GRAY_500[2]);
      doc.text(isKo ? "단가" : "Unit", priceX, y + 7, { align: "right" });
      doc.setFontSize(8.5);
      doc.setTextColor(INK[0], INK[1], INK[2]);
      doc.text(unitVal, priceX, y + 11, { align: "right" });
      doc.setFontSize(6);
      doc.setTextColor(GRAY_500[0], GRAY_500[1], GRAY_500[2]);
      doc.text(isKo ? "소계" : "Sub", priceX, y + 14.5, { align: "right" });
      doc.setFontSize(9.5);
      doc.setTextColor(ACCENT_DK[0], ACCENT_DK[1], ACCENT_DK[2]);
      doc.text(subVal, priceX, y + 18.5, { align: "right" });
      y += cardH + gap;
      continue;
    }

    const thumb = line.thumbUrl ? thumbs.get(line.thumbUrl) : undefined;
    if (thumb) {
      drawPdfThumbOrPlaceholder(doc, thumb, x + 2, y + 1.5, thumbW, thumbH, isKo);
    } else {
      drawPdfThumbOrPlaceholder(doc, undefined, x + 2, y + 1.5, thumbW, thumbH, isKo);
    }

    doc.setFont(font, "normal");
    doc.setFontSize(10);
    doc.setTextColor(INK[0], INK[1], INK[2]);
    doc.text(
      (doc.splitTextToSize(line.name, textW) as string[]).slice(0, 1),
      textX,
      y + 5.5,
    );

    if (line.location?.trim() && line.location !== "—") {
      doc.setFontSize(7);
      doc.setTextColor(GRAY_600[0], GRAY_600[1], GRAY_600[2]);
      doc.text(
        (doc.splitTextToSize(line.location, textW) as string[]).slice(0, 1),
        textX,
        y + 9.5,
      );
    }

    const specParts: string[] = [];
    if (line.quantityLabel) {
      specParts.push(`${isKo ? "수량" : "Qty"} ${line.quantityLabel}`);
    } else if (line.quantity != null && line.quantity > 1) {
      specParts.push(`${isKo ? "수량" : "Qty"} ${line.quantity}`);
    }
    if (line.categoryLabel) specParts.push(line.categoryLabel);
    if (line.size) specParts.push(`${isKo ? "규격" : "Size"} ${line.size}`);
    if (line.operatingHours) {
      specParts.push(`${isKo ? "운영" : "Hours"} ${truncateDocText(line.operatingHours, 24)}`);
    }
    if (specParts.length > 0) {
      doc.setFontSize(6.5);
      doc.setTextColor(GRAY_500[0], GRAY_500[1], GRAY_500[2]);
      doc.text(
        (doc.splitTextToSize(specParts.join(" · "), textW) as string[]).slice(0, 1),
        textX,
        y + 13,
      );
    }

    if (line.dailyTraffic && line.dailyTraffic > 0) {
      doc.setFontSize(6.5);
      doc.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2]);
      const traffic = `${isKo ? "일일 노출" : "Daily"} ${line.dailyTraffic.toLocaleString(isKo ? "ko-KR" : "en-US")}${isKo ? "회" : ""}`;
      doc.text(
        (doc.splitTextToSize(traffic, textW) as string[]).slice(0, 1),
        textX,
        y + 16.5,
      );
    } else if (line.broadcastLabel) {
      doc.setFontSize(6.5);
      doc.setTextColor(GRAY_500[0], GRAY_500[1], GRAY_500[2]);
      doc.text(
        (doc.splitTextToSize(truncateDocText(line.broadcastLabel, 48), textW) as string[]).slice(0, 1),
        textX,
        y + 16.5,
      );
    }

    if (prorationSpec) {
      doc.setFontSize(6.5);
      doc.setTextColor(ACCENT_DK[0], ACCENT_DK[1], ACCENT_DK[2]);
      doc.text(
        (doc.splitTextToSize(prorationSpec, textW) as string[]).slice(0, 1),
        textX,
        y + (line.dailyTraffic && line.dailyTraffic > 0 ? 19.5 : 16.5),
      );
    }

    doc.setFontSize(6);
    doc.setTextColor(GRAY_500[0], GRAY_500[1], GRAY_500[2]);
    doc.text(isKo ? "단가" : "Unit", priceX, y + 7, { align: "right" });
    doc.setFontSize(8.5);
    doc.setTextColor(INK[0], INK[1], INK[2]);
    doc.text(unitVal, priceX, y + 11, { align: "right" });
    doc.setFontSize(6);
    doc.setTextColor(GRAY_500[0], GRAY_500[1], GRAY_500[2]);
    doc.text(isKo ? "소계" : "Sub", priceX, y + 14.5, { align: "right" });
    doc.setFontSize(9.5);
    doc.setTextColor(ACCENT_DK[0], ACCENT_DK[1], ACCENT_DK[2]);
    doc.text(subVal, priceX, y + 18.5, { align: "right" });

    y += cardH + gap;
  }
  return y;
}

/** 매체 카드 목록 (미리보기 MediaDetailCard 와 동일 정보 밀도) */
function drawMediaCards(
  doc: jsPDF,
  font: string,
  p: QuoteExportPayload,
  x: number,
  yStart: number,
  w: number,
  pageH: number,
  thumbs: Map<string, string>,
): number {
  const isKo = p.isKo;
  let y = yStart;

  if (p.lines.length === 0) {
    doc.setFontSize(9);
    doc.setTextColor(GRAY_500[0], GRAY_500[1], GRAY_500[2]);
    doc.text(isKo ? "선택된 매체가 없습니다." : "No media selected.", x + 2, y + 5);
    return y + 10;
  }

  for (const line of p.lines) {
    const thumb = line.thumbUrl ? thumbs.get(line.thumbUrl) : undefined;
    const tW = thumb ? EXPORT_THUMB_BOX_MM.w + 2 : 0;
    const textX = x + 4 + tW;
    const textW = w - 8 - tW;
    const specLines = [
      line.location,
      line.quantityLabel
        ? `${isKo ? "수량" : "Qty"} ${line.quantityLabel}`
        : line.quantity != null && line.quantity > 1
          ? `${isKo ? "수량" : "Qty"} ${line.quantity}`
          : null,
      line.categoryLabel,
      line.size ? `${isKo ? "규격" : "Size"} ${line.size}` : null,
      line.operatingHours
        ? `${isKo ? "운영" : "Hours"} ${line.operatingHours}`
        : null,
      line.dailyTraffic
        ? `${isKo ? "일일 노출" : "Daily"} ${line.dailyTraffic.toLocaleString(isKo ? "ko-KR" : "en-US")}`
        : null,
      line.broadcastLabel
        ? truncateDocText(line.broadcastLabel, 60)
        : null,
      line.executionPeriodLabel
        ? `${isKo ? "집행 기간" : "Period"} ${line.executionPeriodLabel}`
        : null,
      quoteExportProrationSpecLine(line),
    ].filter(Boolean) as string[];

    const priceLine = `${isKo ? "단가" : "Unit"} ${formatDocumentManWon(line.unitPriceWon, isKo)}  ·  ${isKo ? "소계" : "Subtotal"} ${formatDocumentManWon(line.lineSupplyWon, isKo)}`;
    const body = [line.name, ...specLines, priceLine].join("\n");
    const lines = doc.splitTextToSize(body, textW) as string[];
    const rh = Math.max(
      thumb ? EXPORT_THUMB_BOX_MM.h + 4 : 16,
      lines.length * 4.1 + 8,
    );

    if (y + rh > pageH - 28) {
      doc.addPage();
      y = M;
    }

    doc.setFillColor(GRAY_50[0], GRAY_50[1], GRAY_50[2]);
    doc.setDrawColor(GRAY_200[0], GRAY_200[1], GRAY_200[2]);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, y, w, rh, R, R, "FD");

    if (thumb) {
      addPdfThumbImage(doc, thumb, x + 2, y + 2);
    }

    doc.setFont(font, "normal");
    doc.setFontSize(9);
    doc.setTextColor(INK[0], INK[1], INK[2]);
    doc.text(lines.slice(0, 10), textX, y + 5.5);
    y += rh + 3;
  }
  return y;
}

/** 합계 — 만원 표기 (미리보기와 동일) */
function drawTotals(
  doc: jsPDF,
  font: string,
  p: QuoteExportPayload,
  x: number,
  y: number,
  w: number,
  pageH: number,
): number {
  const isKo = p.isKo;
  if (y + 32 > pageH - 20) {
    doc.addPage();
    y = M;
  }

  const boxX = x + w * 0.38;
  const boxW = w - w * 0.38;
  const rows: Array<[string, string, boolean]> = [];
  const linesSubtotal = p.linesSubtotalWon ?? 0;
  const discountTotal = p.discountTotalWon ?? 0;
  if (linesSubtotal > 0 && (discountTotal > 0 || linesSubtotal !== p.supplyWon)) {
    rows.push([
      isKo ? "소계" : "Subtotal",
      formatDocumentManWon(linesSubtotal, isKo),
      false,
    ]);
  }
  if (discountTotal > 0) {
    rows.push([
      p.discountSummary ?? (isKo ? "할인" : "Discount"),
      `−${formatDocumentManWon(discountTotal, isKo)}`,
      false,
    ]);
  }
  rows.push(
    [isKo ? "공급가액" : "Supply", formatDocumentManWon(p.supplyWon, isKo), false],
    [isKo ? "부가세 (10%)" : "VAT (10%)", formatDocumentManWon(p.vatWon, isKo), false],
    [
      isKo ? "합계 (VAT 포함)" : "Total (incl. VAT)",
      formatDocumentManWon(p.totalWon, isKo),
      true,
    ],
  );
  let ry = y;
  doc.setFont(font, "normal");
  rows.forEach(([label, val, accent]) => {
    if (accent) {
      doc.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2]);
      doc.roundedRect(boxX, ry, boxW, 12, R, R, "F");
      doc.setTextColor(255, 237, 213);
      doc.setFontSize(9);
      doc.text(label, boxX + 4, ry + 7.5);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.text(val, boxX + boxW - 4, ry + 8, { align: "right" });
      ry += 14;
    } else {
      doc.setTextColor(GRAY_600[0], GRAY_600[1], GRAY_600[2]);
      doc.setFontSize(9);
      doc.text(label, boxX + 4, ry + 5.5);
      doc.setTextColor(INK[0], INK[1], INK[2]);
      doc.setFontSize(10);
      doc.text(val, boxX + boxW - 4, ry + 5.5, { align: "right" });
      ry += 8;
    }
  });
  return ry;
}

function drawClientCampaign(
  doc: jsPDF,
  font: string,
  p: QuoteExportPayload,
  y: number,
  pageW: number,
): number {
  const isKo = p.isKo;
  const half = (pageW - M * 2 - 6) / 2;

  y = sectionTitle(doc, font, isKo ? "고객 정보" : "Client", y);
  doc.setFillColor(GRAY_50[0], GRAY_50[1], GRAY_50[2]);
  doc.roundedRect(M, y, half, 22, R, R, "F");
  doc.setFontSize(8);
  doc.setTextColor(GRAY_500[0], GRAY_500[1], GRAY_500[2]);
  doc.text(isKo ? "회사" : "Company", M + 4, y + 6);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.setFontSize(10);
  doc.text(p.clientCompany || "—", M + 4, y + 12);
  doc.setFontSize(8);
  doc.setTextColor(GRAY_500[0], GRAY_500[1], GRAY_500[2]);
  const contact = [
    p.clientName && `${isKo ? "담당" : "Attn"} ${p.clientName}`,
    p.clientPhone,
    p.clientEmail,
  ]
    .filter(Boolean)
    .join(" · ");
  doc.text(
    (doc.splitTextToSize(contact || "—", half - 8) as string[]).slice(0, 2),
    M + 4,
    y + 18,
  );

  const rx = M + half + 6;
  doc.setFillColor(GRAY_50[0], GRAY_50[1], GRAY_50[2]);
  doc.roundedRect(rx, y, half, 22, R, R, "F");
  doc.setFontSize(8);
  doc.setTextColor(GRAY_500[0], GRAY_500[1], GRAY_500[2]);
  doc.text(isKo ? "캠페인" : "Campaign", rx + 4, y + 6);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.setFontSize(10);
  doc.text(p.periodLabel, rx + 4, y + 12);
  doc.setFontSize(7.5);
  doc.setTextColor(GRAY_500[0], GRAY_500[1], GRAY_500[2]);
  doc.text(
    isKo ? "금액 단위: 만원 (₩10,000)" : "Amounts in 10K KRW",
    rx + 4,
    y + 18,
  );

  return y + 28;
}

function basicDrawSectionTitleAt(
  doc: jsPDF,
  font: string,
  label: string,
  x: number,
  y: number,
): void {
  doc.setFont(font, "normal");
  doc.setFontSize(11);
  doc.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2]);
  doc.rect(x, y, 1.8, 6.6, "F");
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.text(label, x + 5, y + 4.8);
}

function basicSectionTitle(doc: jsPDF, font: string, label: string, y: number): number {
  basicDrawSectionTitleAt(doc, font, label, M, y);
  return y + 9;
}

function basicDrawQuoteHero(
  doc: jsPDF,
  font: string,
  p: QuoteExportPayload,
  pageW: number,
): number {
  doc.setFillColor(INK_STRONG[0], INK_STRONG[1], INK_STRONG[2]);
  doc.rect(0, 0, pageW, BASIC_HERO_H, "F");
  doc.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2]);
  doc.rect(0, BASIC_HERO_H, pageW, 1.4, "F");

  drawWordmark(doc, font, M, 15, 15, true);
  doc.setFontSize(7);
  doc.setTextColor(229, 231, 235);
  doc.text("ADVERTISING QUOTE", pageW - M, 15, { align: "right" });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text(p.isKo ? "광고 견적서" : "Advertising Quote", M, 30);
  doc.setFontSize(9);
  doc.setTextColor(209, 213, 219);
  const sub = `${p.periodLabel} · ${p.issuedAt}`;
  doc.text(sub, M, 38);
  doc.setFontSize(8);
  doc.text(`No. ${p.quoteNo}`, pageW - M, 38, { align: "right" });
  doc.text(`${p.isKo ? "유효" : "Valid"} ${p.validUntil}`, pageW - M, 43, { align: "right" });

  return BASIC_HERO_H + 2;
}

function basicDrawSummaryStrip(
  doc: jsPDF,
  font: string,
  p: QuoteExportPayload,
  pageW: number,
  y: number,
): number {
  const isKo = p.isKo;
  const contentW = pageW - M * 2;
  const gap = 3;
  const colW = (contentW - gap * 2) / 3;
  const boxH = 16;
  const labels = isKo
    ? ["총액 (VAT 포함)", "유효기간", "싱커드 담당"]
    : ["Total (incl. VAT)", "Valid until", "THINKAD"];
  const totalVal = formatDocumentManWon(p.totalWon, isKo);
  const validityVal = `${p.isKo ? "유효" : "Valid"} ${p.validUntil}`;
  const contactVal = isKo ? "견적·제안 · 02-515-2772" : "Sales · 02-515-2772";

  y += 5;
  doc.setFillColor(255, 255, 255);
  doc.rect(0, y, pageW, boxH + 10, "F");
  y += 4;

  for (let i = 0; i < 3; i++) {
    const x = M + i * (colW + gap);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(GRAY_200[0], GRAY_200[1], GRAY_200[2]);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, y, colW, boxH, R, R, "FD");

    doc.setFont(font, "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(GRAY_500[0], GRAY_500[1], GRAY_500[2]);
    doc.text(labels[i]!.toUpperCase(), x + 3, y + 6);

    if (i === 0) {
      doc.setTextColor(ACCENT_DK[0], ACCENT_DK[1], ACCENT_DK[2]);
      doc.setFontSize(14);
      doc.text(
        (doc.splitTextToSize(totalVal, colW - 6) as string[]).slice(0, 1),
        x + 3,
        y + 14,
      );
    } else if (i === 1) {
      doc.setTextColor(INK[0], INK[1], INK[2]);
      doc.setFontSize(9);
      const vLines = doc.splitTextToSize(validityVal, colW - 6) as string[];
      doc.text(vLines.slice(0, 2), x + 3, y + 13);
    } else {
      doc.setTextColor(INK[0], INK[1], INK[2]);
      doc.setFontSize(9);
      const cLines = doc.splitTextToSize(contactVal, colW - 6) as string[];
      doc.text(cLines.slice(0, 2), x + 3, y + 13);
    }
  }

  return y + boxH + 4;
}

function basicFieldLabel(
  doc: jsPDF,
  font: string,
  text: string,
  x: number,
  y: number,
) {
  doc.setFont(font, "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(GRAY_500[0], GRAY_500[1], GRAY_500[2]);
  doc.text(text.toUpperCase(), x, y);
}

function basicDrawClientSection(
  doc: jsPDF,
  font: string,
  p: QuoteExportPayload,
  y: number,
  pageW: number,
): number {
  const isKo = p.isKo;
  const contentX = M + BASIC_SECTION_TITLE_W;
  const contentW = pageW - M - contentX;
  const sectionY = y + 1;

  basicDrawSectionTitleAt(doc, font, isKo ? "고객 정보" : "Client", M, sectionY);

  const parts = [
    `${isKo ? "회사" : "Company"} ${p.clientCompany || "—"}`,
    `${isKo ? "담당자" : "Contact"} ${p.clientName || "—"}`,
    `${isKo ? "연락처" : "Phone"} ${p.clientPhone || "—"}`,
  ];
  if (p.clientEmail?.trim()) {
    parts.push(`${isKo ? "이메일" : "Email"} ${p.clientEmail.trim()}`);
  }

  doc.setFont(font, "normal");
  doc.setFontSize(9);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  const lines = doc.splitTextToSize(parts.join(" · "), contentW) as string[];
  doc.text(lines.slice(0, 2), contentX, sectionY + 4.5);

  return sectionY + (lines.length > 1 ? 12 : 9);
}

function basicDrawCampaignSection(
  doc: jsPDF,
  font: string,
  p: QuoteExportPayload,
  y: number,
  pageW: number,
): number {
  const isKo = p.isKo;
  const contentX = M + BASIC_SECTION_TITLE_W;
  const contentW = pageW - M - contentX;
  const sectionY = y + 1;

  basicDrawSectionTitleAt(doc, font, isKo ? "캠페인 요약" : "Campaign", M, sectionY);

  const durationMeta = formatCampaignDurationMeta(p.periodLabel, isKo);
  const lineY = sectionY + 4.5;

  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.setFontSize(10.5);
  doc.text(p.periodLabel, contentX, lineY);

  if (durationMeta) {
    const periodW = doc.getTextWidth(p.periodLabel);
    doc.setFontSize(9.5);
    doc.setTextColor(ACCENT_DK[0], ACCENT_DK[1], ACCENT_DK[2]);
    const metaLines = doc.splitTextToSize(` · ${durationMeta}`, contentW - periodW) as string[];
    doc.text(metaLines[0] ?? "", contentX + periodW, lineY);
  }

  return sectionY + 10;
}

function basicDrawMediaTable(
  doc: jsPDF,
  font: string,
  p: QuoteExportPayload,
  x: number,
  yStart: number,
  w: number,
  pageH: number,
): number {
  const isKo = p.isKo;
  let y = yStart;
  const colX = [x + 2, x + 10, x + w * 0.42, x + w - 2];
  const headH = 7;

  const drawHeader = (yy: number) => {
    doc.setFillColor(ACCENT_SOFT[0], ACCENT_SOFT[1], ACCENT_SOFT[2]);
    doc.rect(x, yy, w, headH, "F");
    doc.setFont(font, "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(INK_STRONG[0], INK_STRONG[1], INK_STRONG[2]);
    const heads = isKo ? ["#", "매체명", "위치", "소계"] : ["#", "Media", "Location", "Amt"];
    doc.text(heads[0]!, colX[0]!, yy + 4.8);
    doc.text(heads[1]!, colX[1]!, yy + 4.8);
    doc.text(heads[2]!, colX[2]!, yy + 4.8);
    doc.text(heads[3]!, colX[3]!, yy + 4.8, { align: "right" });
    return yy + headH;
  };

  y = drawHeader(y);
  doc.setFontSize(8.5);

  p.lines.forEach((line, idx) => {
    const prorationSpec = quoteExportProrationSpecLine(line);
    const nameLines = doc.splitTextToSize(
      prorationSpec ? `${line.name}\n${prorationSpec}` : line.name,
      w * 0.38 - 4,
    ) as string[];
    const locLines = doc.splitTextToSize(line.location || "—", w * 0.28) as string[];
    const rowH = Math.max(7, Math.max(nameLines.length, locLines.length) * 3.8 + 2);

    if (y + rowH > pageH - 32) {
      doc.addPage();
      y = M;
      y = drawHeader(y);
      doc.setFontSize(8.5);
    }

    if (idx % 2 === 1) {
      doc.setFillColor(GRAY_50[0], GRAY_50[1], GRAY_50[2]);
      doc.rect(x, y, w, rowH, "F");
    }

    doc.setTextColor(GRAY_500[0], GRAY_500[1], GRAY_500[2]);
    doc.setFontSize(7.5);
    doc.text(String(idx + 1), colX[0]!, y + 4.5);
    doc.setTextColor(INK[0], INK[1], INK[2]);
    doc.setFontSize(9);
    doc.text(nameLines.slice(0, 2), colX[1]!, y + 4.5);
    doc.setFontSize(8);
    doc.setTextColor(GRAY_600[0], GRAY_600[1], GRAY_600[2]);
    doc.text(locLines.slice(0, 2), colX[2]!, y + 4.5);
    doc.setTextColor(ACCENT_DK[0], ACCENT_DK[1], ACCENT_DK[2]);
    doc.setFontSize(9);
    doc.text(
      formatDocumentManWon(line.lineSupplyWon, isKo),
      colX[3]!,
      y + 4.5,
      { align: "right" },
    );

    doc.setDrawColor(GRAY_200[0], GRAY_200[1], GRAY_200[2]);
    doc.line(x, y + rowH, x + w, y + rowH);
    y += rowH;
  });

  doc.setDrawColor(GRAY_200[0], GRAY_200[1], GRAY_200[2]);
  doc.rect(x, yStart, w, y - yStart);
  return y + 4;
}

function basicDrawMediaList(
  doc: jsPDF,
  font: string,
  p: QuoteExportPayload,
  x: number,
  yStart: number,
  w: number,
  pageH: number,
  thumbs: Map<string, string>,
): number {
  if (p.lines.length >= BASIC_COMPACT_MEDIA_MIN) {
    return basicDrawMediaTable(doc, font, p, x, yStart, w, pageH);
  }
  return basicDrawQuoteMediaCards(doc, font, p, x, yStart, w, pageH, thumbs);
}

function basicDrawTotals(
  doc: jsPDF,
  font: string,
  p: QuoteExportPayload,
  x: number,
  y: number,
  w: number,
  pageH: number,
): number {
  const isKo = p.isKo;
  if (y + 34 > pageH - 34) {
    doc.addPage();
    y = M;
  }

  const boxX = x;
  const boxW = w;
  const labelX = boxX + 4;
  const valX = boxX + boxW - 4;
  const rows: Array<[string, string, "normal" | "discount" | "total"]> = [];
  const linesSubtotal = p.linesSubtotalWon ?? 0;
  const discountTotal = p.discountTotalWon ?? 0;
  if (linesSubtotal > 0 && (discountTotal > 0 || linesSubtotal !== p.supplyWon)) {
    rows.push([isKo ? "소계" : "Subtotal", formatDocumentManWon(linesSubtotal, isKo), "normal"]);
  }
  if (discountTotal > 0) {
    rows.push([
      p.discountSummary ?? (isKo ? "할인" : "Discount"),
      `−${formatDocumentManWon(discountTotal, isKo)}`,
      "discount",
    ]);
  }
  rows.push(
    [isKo ? "공급가액" : "Supply", formatDocumentManWon(p.supplyWon, isKo), "normal"],
    [isKo ? "부가세 (10%)" : "VAT (10%)", formatDocumentManWon(p.vatWon, isKo), "normal"],
    [
      isKo ? "합계 (VAT 포함)" : "Total (incl. VAT)",
      formatDocumentManWon(p.totalWon, isKo),
      "total",
    ],
  );

  let ry = y;
  doc.setFont(font, "normal");
  rows.forEach(([label, val, tone]) => {
    if (tone === "total") {
      doc.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2]);
      doc.roundedRect(boxX, ry, boxW, 12, R, R, "F");
      doc.setTextColor(255, 237, 213);
      doc.setFontSize(7.5);
      doc.text(label, labelX, ry + 7.5);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.text(val, valX, ry + 8, { align: "right" });
      ry += 14;
    } else {
      doc.setTextColor(GRAY_500[0], GRAY_500[1], GRAY_500[2]);
      doc.setFontSize(7.5);
      doc.text(label.toUpperCase(), labelX, ry + 5.5);
      if (tone === "discount") {
        doc.setTextColor(RED_700[0], RED_700[1], RED_700[2]);
      } else {
        doc.setTextColor(INK[0], INK[1], INK[2]);
      }
      doc.setFontSize(10.5);
      doc.text(val, valX, ry + 5, { align: "right" });
      ry += 8;
    }
  });
  return ry;
}

function basicDrawFooter(
  doc: jsPDF,
  font: string,
  p: QuoteExportPayload,
  pageW: number,
  y: number,
) {
  const isKo = p.isKo;
  const contentW = pageW - M * 2;
  const footerTop = y + 4;

  doc.setDrawColor(GRAY_200[0], GRAY_200[1], GRAY_200[2]);
  doc.setLineWidth(0.3);
  doc.line(M, footerTop, M + contentW, footerTop);

  doc.setFontSize(7);
  doc.setTextColor(GRAY_500[0], GRAY_500[1], GRAY_500[2]);
  doc.text(
    isKo
      ? "※ 본 견적은 참고용이며, 실제 계약 시 재확인됩니다."
      : "For reference; confirm at contract.",
    M,
    footerTop + 5,
  );

  doc.setFontSize(7.5);
  doc.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2]);
  doc.text(isKo ? "담당자 확인" : "Authorized by", M, footerTop + 12);
  doc.setDrawColor(GRAY_200[0], GRAY_200[1], GRAY_200[2]);
  doc.line(M, footerTop + 22, M + contentW * 0.42, footerTop + 22);

  const rx = M + contentW * 0.52;
  doc.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2]);
  doc.text(p.issuer.company, rx, footerTop + 12);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.setFontSize(8);
  doc.text(`${p.issuer.phone}  ·  ${p.issuer.email}`, rx, footerTop + 17);
  doc.setFontSize(7);
  doc.setTextColor(GRAY_500[0], GRAY_500[1], GRAY_500[2]);
  doc.text(p.issuer.address, rx, footerTop + 22);
}

/** ── 기본 견적서 (라이트 · 플래너 보고서 톤) ── */
async function buildBasic(doc: jsPDF, font: string, p: QuoteExportPayload, thumbs: Map<string, string>) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - M * 2;
  const isKo = p.isKo;

  let y = basicDrawQuoteHero(doc, font, p, pageW);
  y = basicDrawSummaryStrip(doc, font, p, pageW, y);
  y = basicDrawClientSection(doc, font, p, y, pageW);
  y = basicDrawCampaignSection(doc, font, p, y, pageW);
  y = basicSectionTitle(doc, font, isKo ? "매체 내역" : "Media lineup", y);
  y = basicDrawMediaList(doc, font, p, M, y, contentW, pageH, thumbs);
  y += 2;
  y = basicSectionTitle(doc, font, isKo ? "합계" : "Total", y);
  y = basicDrawTotals(doc, font, p, M, y, contentW, pageH);

  const footerY = y + 4;
  await drawStamp(doc, font, p, pageW - M - 14, footerY + 18);

  basicDrawFooter(doc, font, p, pageW, y);
}

/** ── 프리미엄: P1 다크 제안 · P2 공식 견적(라이트) ── */
async function buildPremium(doc: jsPDF, font: string, p: QuoteExportPayload, thumbs: Map<string, string>) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - M * 2;
  const isKo = p.isKo;

  doc.setFillColor(DARK_BG[0], DARK_BG[1], DARK_BG[2]);
  doc.rect(0, 0, pageW, pageH, "F");
  doc.setFillColor(INK_STRONG[0], INK_STRONG[1], INK_STRONG[2]);
  doc.rect(0, 0, pageW, 70, "F");
  doc.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2]);
  doc.rect(0, 70, pageW, 1.4, "F");

  drawWordmark(doc, font, M, 24, 18, true);
  doc.setTextColor(229, 231, 235);
  doc.setFontSize(10);
  doc.text(isKo ? "광고 캠페인 제안 · 견적" : "Campaign proposal & quote", M, 31);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(26);
  doc.text(isKo ? "광고 제안서" : "Campaign Proposal", M, 52);
  doc.setFontSize(11);
  doc.setTextColor(209, 213, 219);
  doc.text(`${p.clientCompany} ${isKo ? "귀중" : ""}`.trim(), M, 62);

  const stats: Array<[string, string]> = [
    [isKo ? "선정 매체" : "Media", `${p.lines.length}${isKo ? "개" : ""}`],
    [
      isKo ? "예상 노출" : "Impressions",
      p.totalImpressions > 0
        ? p.totalImpressions.toLocaleString(isKo ? "ko-KR" : "en-US")
        : "—",
    ],
    [
      isKo ? "블렌디드 CPM" : "Blended CPM",
      p.blendedCpmWon ? formatDocumentManWon(p.blendedCpmWon, isKo) : "—",
    ],
    [isKo ? "합계 금액" : "Total", formatDocumentManWon(p.totalWon, isKo)],
  ];
  let sy = 84;
  const cardW = (contentW - 9) / 2;
  stats.forEach((s, i) => {
    const col = i % 2;
    const xx = M + col * (cardW + 9);
    if (col === 0 && i > 0) sy += 26;
    doc.setFillColor(DARK_CARD[0], DARK_CARD[1], DARK_CARD[2]);
    doc.roundedRect(xx, sy, cardW, 22, R, R, "F");
    doc.setFont(font, "normal");
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(s[0], xx + 5, sy + 8);
    doc.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2]);
    doc.setFontSize(16);
    doc.text((doc.splitTextToSize(s[1], cardW - 10) as string[]).slice(0, 1), xx + 5, sy + 17);
  });

  let hy = sy + 36;
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(isKo ? "선정 매체" : "Selected media", M, hy);
  hy += 7;
  doc.setFontSize(9);
  p.lines.slice(0, 8).forEach((l) => {
    doc.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2]);
    doc.circle(M + 1.4, hy - 1.4, 0.9, "F");
    doc.setTextColor(229, 231, 235);
    const t = `${l.name}  —  ${l.location}`;
    doc.text((doc.splitTextToSize(t, contentW - 8) as string[]).slice(0, 1), M + 5, hy);
    hy += 6.5;
  });

  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text(`No. ${p.quoteNo}  ·  ${p.issuedAt}`, M, pageH - 10);

  doc.addPage();
  doc.setFillColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.rect(0, 0, pageW, pageH, "F");

  let y = drawQuoteHero(
    doc,
    font,
    p,
    pageW,
    "PREMIUM QUOTE",
    isKo ? "공식 견적서" : "Official Quote",
  );
  y = drawClientCampaign(doc, font, p, y, pageW);
  y = sectionTitle(doc, font, isKo ? "매체 내역" : "Media lineup", y);
  y = drawMediaCards(doc, font, p, M, y, contentW, pageH, thumbs);
  y += 6;
  y = sectionTitle(doc, font, isKo ? "합계" : "Total", y);
  drawTotals(doc, font, p, M, y, contentW, pageH);

  await drawStamp(doc, font, p, pageW - M - 16, pageH - 34);

  doc.setFontSize(7);
  doc.setTextColor(GRAY_500[0], GRAY_500[1], GRAY_500[2]);
  doc.text(`${p.issuer.company}  ·  ${p.issuer.email}  ·  ${p.issuer.phone}`, M, pageH - 8);
}

export async function buildQuotePdf(p: QuoteExportPayload): Promise<Uint8Array> {
  const { default: JsPDF } = await import("jspdf");
  const doc = new JsPDF({ unit: "mm", format: "a4" });
  const hasKr = registerNotoSansKrIfAvailable(doc);
  const font = krFontFamily(hasKr);

  const thumbs = await loadExportThumbMap(p.lines);

  if (p.template === "premium") {
    await buildPremium(doc, font, p, thumbs);
  } else {
    await buildBasic(doc, font, p, thumbs);
  }

  const ab = doc.output("arraybuffer") as ArrayBuffer;
  return new Uint8Array(ab);
}

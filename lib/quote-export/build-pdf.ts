import type { jsPDF } from "jspdf";
import { registerNotoSansKrIfAvailable } from "@/lib/jspdf-register-noto-kr";
import { krFontFamily } from "@/lib/jspdf-kr-font-constants";
import { formatDocumentManWon, truncateDocText } from "@/lib/document-text";
import {
  addPdfThumbImage,
  EXPORT_THUMB_BOX_MM,
  loadExportThumbMap,
} from "@/lib/export-media-images";
import { loadQuoteStampDataUrl } from "@/lib/quote-pdf-assets";
import type { QuoteExportPayload } from "@/lib/quote-export/types";

const VIOLET = [124, 58, 237] as const;
const VIOLET_DK = [76, 29, 149] as const;
const CYAN = [8, 145, 178] as const;
const CYAN_LT = [120, 220, 235] as const;
const INK = [17, 24, 39] as const;
const GRAY_600 = [75, 85, 99] as const;
const GRAY_500 = [107, 114, 128] as const;
const GRAY_200 = [228, 230, 236] as const;
const GRAY_50 = [248, 249, 251] as const;
const DARK_BG = [10, 10, 18] as const;
const DARK_CARD = [22, 22, 34] as const;
const WHITE = [255, 255, 255] as const;

const M = 15;
const HERO_H = 44;

/** 직인: 로컬 public/brand → 원격 URL 순. 없으면 생략 (가짜 도장 미표시). */
async function resolveStampDataUrl(url?: string): Promise<string | null> {
  const local = loadQuoteStampDataUrl();
  if (local) return local;
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
  doc.setTextColor(255, 255, 255);
  doc.text("THINK", x, baseY);
  const w = doc.getTextWidth("THINK");
  if (onDark) doc.setTextColor(CYAN_LT[0], CYAN_LT[1], CYAN_LT[2]);
  else doc.setTextColor(CYAN[0], CYAN[1], CYAN[2]);
  doc.text("AD", x + w, baseY);
}

function sectionTitle(doc: jsPDF, font: string, label: string, y: number): number {
  doc.setFont(font, "normal");
  doc.setFontSize(11);
  doc.setFillColor(VIOLET[0], VIOLET[1], VIOLET[2]);
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
  doc.setFillColor(VIOLET_DK[0], VIOLET_DK[1], VIOLET_DK[2]);
  doc.rect(0, 0, pageW, HERO_H, "F");
  doc.setFillColor(CYAN[0], CYAN[1], CYAN[2]);
  doc.rect(0, HERO_H, pageW, 1.2, "F");

  drawWordmark(doc, font, M, 14, 14, true);
  doc.setFontSize(7.5);
  doc.setTextColor(214, 199, 255);
  doc.text(badge, pageW - M, 14, { align: "right" });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text(title, M, 28);
  doc.setFontSize(9);
  doc.setTextColor(225, 220, 245);
  const sub = `${p.periodLabel} · ${p.issuedAt}`;
  doc.text(sub, M, 36);
  doc.setFontSize(8);
  doc.text(`No. ${p.quoteNo}`, pageW - M, 36, { align: "right" });
  doc.text(`${p.isKo ? "유효" : "Valid"} ${p.validUntil}`, pageW - M, 41, { align: "right" });

  return HERO_H + 6;
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
    doc.roundedRect(x, y, w, rh, 2, 2, "FD");

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
  const rows: Array<[string, string, boolean]> = [
    [isKo ? "공급가액" : "Supply", formatDocumentManWon(p.supplyWon, isKo), false],
    [isKo ? "부가세 (10%)" : "VAT (10%)", formatDocumentManWon(p.vatWon, isKo), false],
    [
      isKo ? "합계 (VAT 포함)" : "Total (incl. VAT)",
      formatDocumentManWon(p.totalWon, isKo),
      true,
    ],
  ];
  let ry = y;
  doc.setFont(font, "normal");
  rows.forEach(([label, val, accent]) => {
    if (accent) {
      doc.setFillColor(VIOLET[0], VIOLET[1], VIOLET[2]);
      doc.roundedRect(boxX, ry, boxW, 12, 1.5, 1.5, "F");
      doc.setTextColor(235, 230, 255);
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
  doc.roundedRect(M, y, half, 22, 2, 2, "F");
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
  doc.roundedRect(rx, y, half, 22, 2, 2, "F");
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

/** ── 기본 견적서 (라이트 · 플래너 보고서 톤) ── */
async function buildBasic(doc: jsPDF, font: string, p: QuoteExportPayload, thumbs: Map<string, string>) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - M * 2;
  const isKo = p.isKo;

  let y = drawQuoteHero(
    doc,
    font,
    p,
    pageW,
    "ADVERTISING QUOTE",
    isKo ? "광고 견적서" : "Advertising Quote",
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
  doc.text(p.issuer.address, M, pageH - 10);
  doc.text(
    isKo
      ? "※ 본 견적은 발행일 기준이며 매체 재고에 따라 변동될 수 있습니다."
      : "Estimate as of issue date; subject to inventory.",
    M,
    pageH - 6,
  );
}

/** ── 프리미엄: P1 다크 제안 · P2 공식 견적(라이트) ── */
async function buildPremium(doc: jsPDF, font: string, p: QuoteExportPayload, thumbs: Map<string, string>) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - M * 2;
  const isKo = p.isKo;

  doc.setFillColor(DARK_BG[0], DARK_BG[1], DARK_BG[2]);
  doc.rect(0, 0, pageW, pageH, "F");
  doc.setFillColor(VIOLET_DK[0], VIOLET_DK[1], VIOLET_DK[2]);
  doc.rect(0, 0, pageW, 70, "F");
  doc.setFillColor(CYAN[0], CYAN[1], CYAN[2]);
  doc.rect(0, 70, pageW, 1.4, "F");

  drawWordmark(doc, font, M, 24, 18, true);
  doc.setTextColor(214, 199, 255);
  doc.setFontSize(10);
  doc.text(isKo ? "광고 캠페인 제안 · 견적" : "Campaign proposal & quote", M, 31);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(26);
  doc.text(isKo ? "광고 제안서" : "Campaign Proposal", M, 52);
  doc.setFontSize(11);
  doc.setTextColor(225, 220, 245);
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
    doc.roundedRect(xx, sy, cardW, 22, 2, 2, "F");
    doc.setFont(font, "normal");
    doc.setFontSize(8);
    doc.setTextColor(170, 170, 190);
    doc.text(s[0], xx + 5, sy + 8);
    doc.setTextColor(CYAN_LT[0], CYAN_LT[1], CYAN_LT[2]);
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
    doc.setFillColor(CYAN[0], CYAN[1], CYAN[2]);
    doc.circle(M + 1.4, hy - 1.4, 0.9, "F");
    doc.setTextColor(225, 225, 235);
    const t = `${l.name}  —  ${l.location}`;
    doc.text((doc.splitTextToSize(t, contentW - 8) as string[]).slice(0, 1), M + 5, hy);
    hy += 6.5;
  });

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 170);
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

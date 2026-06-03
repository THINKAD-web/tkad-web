import type { jsPDF } from "jspdf";
import { registerNotoSansKrIfAvailable } from "@/lib/jspdf-register-noto-kr";
import { krFontFamily } from "@/lib/jspdf-kr-font-constants";
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
const RED = [200, 30, 40] as const;
const WHITE = [255, 255, 255] as const;

const M = 16;

function won(n: number, isKo: boolean): string {
  return `₩${n.toLocaleString(isKo ? "ko-KR" : "en-US")}`;
}

/** 직인: 이미지가 있으면 임베드, 없으면 빨간 원형 도장 도형 폴백 */
async function fetchStampDataUrl(url?: string): Promise<string | null> {
  if (!url) return null;
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

function drawFallbackSeal(
  doc: jsPDF,
  font: string,
  cx: number,
  cy: number,
  isKo: boolean,
) {
  doc.setDrawColor(RED[0], RED[1], RED[2]);
  doc.setLineWidth(1.1);
  doc.circle(cx, cy, 12, "S");
  doc.setLineWidth(0.4);
  doc.circle(cx, cy, 9.5, "S");
  doc.setTextColor(RED[0], RED[1], RED[2]);
  doc.setFont(font, "normal");
  doc.setFontSize(7);
  doc.text("THINKAD", cx, cy - 1.5, { align: "center" });
  doc.setFontSize(9);
  doc.text(isKo ? "직인" : "SEAL", cx, cy + 4, { align: "center" });
}

async function drawStamp(
  doc: jsPDF,
  font: string,
  p: QuoteExportPayload,
  cx: number,
  cy: number,
) {
  const data = await fetchStampDataUrl(p.stampUrl);
  if (data) {
    try {
      doc.addImage(data, "PNG", cx - 13, cy - 13, 26, 26, undefined, "FAST", -3);
      return;
    } catch {
      /* fall through to drawn seal */
    }
  }
  drawFallbackSeal(doc, font, cx, cy, p.isKo);
}

/** 매체 내역 테이블 (양 템플릿 공용) — 라이트 카드 위 */
function drawMediaTable(
  doc: jsPDF,
  font: string,
  p: QuoteExportPayload,
  x: number,
  yStart: number,
  w: number,
): number {
  const isKo = p.isKo;
  let y = yStart;
  const cols = [
    { label: isKo ? "매체" : "Media", w: w * 0.42, align: "left" as const },
    { label: isKo ? "위치" : "Location", w: w * 0.28, align: "left" as const },
    { label: isKo ? "단가" : "Unit", w: w * 0.15, align: "right" as const },
    { label: isKo ? "소계" : "Subtotal", w: w * 0.15, align: "right" as const },
  ];
  // header
  doc.setFillColor(VIOLET[0], VIOLET[1], VIOLET[2]);
  doc.rect(x, y, w, 8, "F");
  doc.setFont(font, "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  let cx = x + 2.5;
  for (const c of cols) {
    doc.text(c.label, c.align === "right" ? cx + c.w - 5 : cx, y + 5.4, {
      align: c.align,
    });
    cx += c.w;
  }
  y += 8;

  doc.setFontSize(8.5);
  if (p.lines.length === 0) {
    doc.setTextColor(GRAY_500[0], GRAY_500[1], GRAY_500[2]);
    doc.text(isKo ? "선택된 매체가 없습니다." : "No media.", x + 3, y + 5);
    return y + 9;
  }
  p.lines.forEach((line, i) => {
    const nameLines = doc.splitTextToSize(line.name, cols[0]!.w - 4) as string[];
    const rh = Math.max(8, nameLines.length * 4.2 + 3.5);
    if (i % 2 === 1) {
      doc.setFillColor(GRAY_50[0], GRAY_50[1], GRAY_50[2]);
      doc.rect(x, y, w, rh, "F");
    }
    let ccx = x + 2.5;
    doc.setTextColor(INK[0], INK[1], INK[2]);
    doc.text(nameLines.slice(0, 2), ccx, y + 5);
    ccx += cols[0]!.w;
    doc.setTextColor(GRAY_600[0], GRAY_600[1], GRAY_600[2]);
    doc.text(
      (doc.splitTextToSize(line.location || "—", cols[1]!.w - 4) as string[]).slice(0, 1),
      ccx,
      y + 5,
    );
    ccx += cols[1]!.w;
    doc.setTextColor(INK[0], INK[1], INK[2]);
    doc.text(won(line.unitPriceWon, isKo), ccx + cols[2]!.w - 5, y + 5, { align: "right" });
    ccx += cols[2]!.w;
    doc.text(won(line.lineSupplyWon, isKo), ccx + cols[3]!.w - 5, y + 5, { align: "right" });
    y += rh;
    doc.setDrawColor(GRAY_200[0], GRAY_200[1], GRAY_200[2]);
    doc.setLineWidth(0.1);
    doc.line(x, y, x + w, y);
  });
  return y;
}

/** 합계 박스 (공급가/VAT/합계) */
function drawTotals(
  doc: jsPDF,
  font: string,
  p: QuoteExportPayload,
  x: number,
  y: number,
  w: number,
): number {
  const isKo = p.isKo;
  const boxX = x + w * 0.42;
  const boxW = w - w * 0.42;
  const rows: Array<[string, string, boolean]> = [
    [isKo ? "공급가액" : "Supply", won(p.supplyWon, isKo), false],
    [isKo ? "부가세 (10%)" : "VAT (10%)", won(p.vatWon, isKo), false],
    [isKo ? "합계 금액" : "Total", won(p.totalWon, isKo), true],
  ];
  let ry = y;
  doc.setFont(font, "normal");
  rows.forEach(([label, val, accent]) => {
    if (accent) {
      doc.setFillColor(VIOLET[0], VIOLET[1], VIOLET[2]);
      doc.roundedRect(boxX, ry, boxW, 11, 1.5, 1.5, "F");
      doc.setTextColor(235, 230, 255);
      doc.setFontSize(9);
      doc.text(label, boxX + 4, ry + 7);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(13);
      doc.text(val, boxX + boxW - 4, ry + 7.5, { align: "right" });
      ry += 13;
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

function drawWordmark(doc: jsPDF, font: string, x: number, baseY: number, size: number, onDark: boolean) {
  doc.setFont(font, "normal");
  doc.setFontSize(size);
  doc.setTextColor(255, 255, 255);
  doc.text("THINK", x, baseY);
  const w = doc.getTextWidth("THINK");
  if (onDark) doc.setTextColor(CYAN_LT[0], CYAN_LT[1], CYAN_LT[2]);
  else doc.setTextColor(CYAN[0], CYAN[1], CYAN[2]);
  doc.text("AD", x + w, baseY);
}

/** ── 기본 견적서 (라이트) ── */
async function buildBasic(doc: jsPDF, font: string, p: QuoteExportPayload) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - M * 2;
  const isKo = p.isKo;

  // 좌측 보라 사이드바
  doc.setFillColor(VIOLET[0], VIOLET[1], VIOLET[2]);
  doc.rect(0, 0, 6, pageH, "F");

  // 헤더
  drawWordmark(doc, font, M, 18, 16, false);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.setFontSize(22);
  doc.text(isKo ? "광고 견적서" : "Advertising Quote", M, 32);

  doc.setFontSize(8.5);
  doc.setTextColor(GRAY_500[0], GRAY_500[1], GRAY_500[2]);
  doc.text(`No. ${p.quoteNo}`, pageW - M, 16, { align: "right" });
  doc.text(`${isKo ? "발행일" : "Issued"} ${p.issuedAt}`, pageW - M, 22, { align: "right" });
  doc.text(`${isKo ? "유효기간" : "Valid until"} ${p.validUntil}`, pageW - M, 28, { align: "right" });

  doc.setDrawColor(GRAY_200[0], GRAY_200[1], GRAY_200[2]);
  doc.setLineWidth(0.3);
  doc.line(M, 38, pageW - M, 38);

  // 수신 / 발행
  let y = 48;
  doc.setFontSize(8);
  doc.setTextColor(GRAY_500[0], GRAY_500[1], GRAY_500[2]);
  doc.text(isKo ? "수신" : "To", M, y);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.setFontSize(13);
  doc.text(`${p.clientCompany}  ${isKo ? "귀중" : ""}`.trim(), M, y + 7);
  doc.setFontSize(8.5);
  doc.setTextColor(GRAY_500[0], GRAY_500[1], GRAY_500[2]);
  const contactBits = [
    p.clientName && `${isKo ? "담당" : "Attn"}: ${p.clientName}`,
    p.clientEmail,
    p.clientPhone,
  ].filter(Boolean);
  doc.text(contactBits.join("   |   "), M, y + 13);

  const rx = pageW / 2 + 6;
  doc.setFontSize(8);
  doc.text(isKo ? "발행" : "From", rx, y);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.setFontSize(11);
  doc.text(p.issuer.company, rx, y + 7);
  doc.setFontSize(8);
  doc.setTextColor(GRAY_500[0], GRAY_500[1], GRAY_500[2]);
  doc.text(`${p.issuer.email}  |  ${p.issuer.phone}`, rx, y + 12.5);

  y += 24;
  doc.setFontSize(8);
  doc.setTextColor(GRAY_500[0], GRAY_500[1], GRAY_500[2]);
  doc.text(`${isKo ? "집행 기간" : "Flight"}: ${p.periodLabel}`, M, y);
  y += 6;

  // 매체 테이블
  y = drawMediaTable(doc, font, p, M, y, contentW);
  y += 8;

  // 합계
  drawTotals(doc, font, p, M, y, contentW);

  // 직인 (우하단)
  await drawStamp(doc, font, p, pageW - M - 16, pageH - 34);

  // 푸터
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

/** ── 프리미엄 견적서 (다크 제안서) ── */
async function buildPremium(doc: jsPDF, font: string, p: QuoteExportPayload) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - M * 2;
  const isKo = p.isKo;

  // page 1 — 다크 히어로 + 통계
  doc.setFillColor(DARK_BG[0], DARK_BG[1], DARK_BG[2]);
  doc.rect(0, 0, pageW, pageH, "F");
  // 그라디언트 느낌의 상단 밴드
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

  // 통계 카드
  const stats: Array<[string, string]> = [
    [isKo ? "선정 매체" : "Media", `${p.lines.length}${isKo ? "개" : ""}`],
    [isKo ? "예상 노출" : "Impressions", p.totalImpressions > 0 ? p.totalImpressions.toLocaleString(isKo ? "ko-KR" : "en-US") : "—"],
    [isKo ? "블렌디드 CPM" : "Blended CPM", p.blendedCpmWon ? won(p.blendedCpmWon, isKo) : "—"],
    [isKo ? "합계 금액" : "Total", won(p.totalWon, isKo)],
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

  // 선정 매체 하이라이트 (다크)
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

  // page 2 — 공식 견적서 (라이트 카드)
  doc.addPage();
  doc.setFillColor(DARK_BG[0], DARK_BG[1], DARK_BG[2]);
  doc.rect(0, 0, pageW, pageH, "F");
  // 라이트 카드
  const cardX = M - 4;
  const cardY = 16;
  const cardWidth = pageW - (M - 4) * 2;
  doc.setFillColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.roundedRect(cardX, cardY, cardWidth, pageH - 32, 3, 3, "F");

  const ix = cardX + 8;
  const iw = cardWidth - 16;
  let y = cardY + 14;
  drawWordmark(doc, font, ix, y, 13, false);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.setFontSize(15);
  doc.text(isKo ? "공식 견적서" : "Official Quote", ix, y + 9);
  doc.setFontSize(8);
  doc.setTextColor(GRAY_500[0], GRAY_500[1], GRAY_500[2]);
  doc.text(`No. ${p.quoteNo}`, cardX + cardWidth - 8, y, { align: "right" });
  doc.text(`${isKo ? "발행" : "Issued"} ${p.issuedAt}`, cardX + cardWidth - 8, y + 5, { align: "right" });
  doc.text(`${isKo ? "유효" : "Valid"} ${p.validUntil}`, cardX + cardWidth - 8, y + 10, { align: "right" });

  y += 18;
  doc.setDrawColor(GRAY_200[0], GRAY_200[1], GRAY_200[2]);
  doc.setLineWidth(0.3);
  doc.line(ix, y, ix + iw, y);
  y += 6;
  doc.setFontSize(8.5);
  doc.setTextColor(GRAY_600[0], GRAY_600[1], GRAY_600[2]);
  doc.text(`${isKo ? "수신" : "To"}: ${p.clientCompany}`, ix, y);
  doc.text(`${isKo ? "기간" : "Flight"}: ${p.periodLabel}`, cardX + cardWidth - 8, y, { align: "right" });
  y += 7;

  y = drawMediaTable(doc, font, p, ix, y, iw);
  y += 8;
  drawTotals(doc, font, p, ix, y, iw);

  await drawStamp(doc, font, p, cardX + cardWidth - 22, cardY + (pageH - 32) - 26);

  doc.setFontSize(7);
  doc.setTextColor(GRAY_500[0], GRAY_500[1], GRAY_500[2]);
  doc.text(`${p.issuer.company}  ·  ${p.issuer.email}  ·  ${p.issuer.phone}`, ix, cardY + (pageH - 32) - 8);
}

export async function buildQuotePdf(p: QuoteExportPayload): Promise<Uint8Array> {
  const { default: JsPDF } = await import("jspdf");
  const doc = new JsPDF({ unit: "mm", format: "a4" });
  const hasKr = registerNotoSansKrIfAvailable(doc);
  const font = krFontFamily(hasKr);

  if (p.template === "premium") {
    await buildPremium(doc, font, p);
  } else {
    await buildBasic(doc, font, p);
  }

  const ab = doc.output("arraybuffer") as ArrayBuffer;
  return new Uint8Array(ab);
}

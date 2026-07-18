import type { QuoteExportPayload } from "@/lib/quote-export/types";
import { resolveQuoteStampDataUrl } from "@/lib/quote-pdf-assets";

/** Quiet Professional — 흑백 + 주황 단일 액센트 */
const ACCENT = "FF6200";
const INK = "111827";
const INK_STRONG = "1C1C1F";
const GRAY = "6B7280";
const LIGHT = "F8F9FB";
const WHITE = "FFFFFF";
const DARK = "0A0A0C";
const DARK_CARD = "1C1C1F";
const MUTED_ON_DARK = "9CA3AF";
const SOFT_ON_DARK = "E5E7EB";

function won(n: number, isKo: boolean): string {
  return `₩${n.toLocaleString(isKo ? "ko-KR" : "en-US")}`;
}

async function resolveStampDataUrl(url?: string): Promise<string | null> {
  return resolveQuoteStampDataUrl(url);
}

export async function buildQuotePptx(p: QuoteExportPayload): Promise<Uint8Array> {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "THINKAD";
  pptx.company = "THINKAD";
  pptx.title = p.isKo ? "광고 견적서" : "Advertising Quote";

  const isKo = p.isKo;
  const face = isKo ? "Malgun Gothic" : "Arial";
  const W = 13.33;
  const stamp = await resolveStampDataUrl(p.stampUrl);

  const wordmark = (size: number, onDark: boolean) =>
    [
      { text: "THINK", options: { color: onDark ? WHITE : INK, bold: true } },
      { text: "AD", options: { color: ACCENT, bold: true } },
    ].map((r) => ({ ...r, options: { ...r.options, fontFace: face, fontSize: size } }));

  function addStamp(slide: ReturnType<typeof pptx.addSlide>, x: number, y: number) {
    if (!stamp) return;
    slide.addImage({ data: stamp, x, y, w: 1.1, h: 1.1, rotate: 357 });
  }

  const mediaTableRows = () => {
    const head = [isKo ? "매체" : "Media", isKo ? "위치" : "Location", isKo ? "단가" : "Unit", isKo ? "소계" : "Subtotal"].map((t) => ({
      text: t, options: { fill: { color: ACCENT }, color: WHITE, bold: true, fontFace: face, fontSize: 11 },
    }));
    const body =
      p.lines.length === 0
        ? [[{ text: isKo ? "선택된 매체가 없습니다." : "No media.", options: { colspan: 4, align: "center" as const, color: GRAY, fontFace: face, fontSize: 11 } }]]
        : p.lines.slice(0, 14).map((l, i) => {
            const fill = i % 2 ? { color: LIGHT } : { color: WHITE };
            return [
              { text: l.name, options: { fill, color: INK, fontFace: face, fontSize: 10 } },
              { text: l.location || "—", options: { fill, color: GRAY, fontFace: face, fontSize: 10 } },
              { text: won(l.unitPriceWon, isKo), options: { fill, color: INK, fontFace: face, fontSize: 10, align: "right" as const } },
              { text: won(l.lineSupplyWon, isKo), options: { fill, color: INK, fontFace: face, fontSize: 10, align: "right" as const } },
            ];
          });
    return [head, ...body];
  };

  const totalsBlock = (slide: ReturnType<typeof pptx.addSlide>, x: number, y: number, w: number) => {
    slide.addTable(
      [
        [
          { text: isKo ? "공급가액" : "Supply", options: { color: GRAY, fontFace: face, fontSize: 11 } },
          { text: won(p.supplyWon, isKo), options: { color: INK, align: "right", fontFace: face, fontSize: 11 } },
        ],
        [
          { text: isKo ? "부가세 (10%)" : "VAT (10%)", options: { color: GRAY, fontFace: face, fontSize: 11 } },
          { text: won(p.vatWon, isKo), options: { color: INK, align: "right", fontFace: face, fontSize: 11 } },
        ],
        [
          { text: isKo ? "합계 금액" : "Total", options: { fill: { color: ACCENT }, color: WHITE, bold: true, fontFace: face, fontSize: 13 } },
          { text: won(p.totalWon, isKo), options: { fill: { color: ACCENT }, color: WHITE, bold: true, align: "right", fontFace: face, fontSize: 13 } },
        ],
      ],
      { x, y, w, colW: [w * 0.55, w * 0.45], rowH: 0.45, valign: "middle", border: { type: "none" } },
    );
  };

  if (p.template === "premium") {
    // 표지 — 다크 + 주황 액센트 (qp)
    const c = pptx.addSlide();
    c.background = { color: DARK };
    c.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 3.2, fill: { color: INK_STRONG } });
    c.addShape(pptx.ShapeType.rect, { x: 0, y: 3.2, w: W, h: 0.06, fill: { color: ACCENT } });
    c.addText(wordmark(28, true), { x: 0.7, y: 0.7, w: 6, h: 0.7 });
    c.addText(isKo ? "광고 제안서 · 견적" : "Campaign Proposal & Quote", { x: 0.72, y: 1.5, w: 10, h: 0.4, fontFace: face, fontSize: 14, color: SOFT_ON_DARK });
    c.addText(`${p.clientCompany} ${isKo ? "귀중" : ""}`.trim(), { x: 0.72, y: 2.1, w: 11, h: 0.6, fontFace: face, fontSize: 24, bold: true, color: WHITE });
    const stats: Array<[string, string]> = [
      [isKo ? "선정 매체" : "Media", `${p.lines.length}${isKo ? "개" : ""}`],
      [isKo ? "예상 노출" : "Impressions", p.totalImpressions > 0 ? p.totalImpressions.toLocaleString(isKo ? "ko-KR" : "en-US") : "—"],
      [isKo ? "블렌디드 CPM" : "Blended CPM", p.blendedCpmWon ? won(p.blendedCpmWon, isKo) : "—"],
      [isKo ? "합계 금액" : "Total", won(p.totalWon, isKo)],
    ];
    stats.forEach((s, i) => {
      const x = 0.7 + i * 3.05;
      c.addShape(pptx.ShapeType.rect, { x, y: 4.2, w: 2.85, h: 1.7, fill: { color: DARK_CARD } });
      c.addText(s[0], { x: x + 0.2, y: 4.4, w: 2.5, h: 0.35, fontFace: face, fontSize: 11, color: MUTED_ON_DARK });
      c.addText(s[1], { x: x + 0.2, y: 4.85, w: 2.5, h: 0.8, fontFace: face, fontSize: 18, bold: true, color: ACCENT });
    });
    c.addText(`No. ${p.quoteNo}  ·  ${p.issuedAt}`, { x: 0.7, y: 6.9, w: 8, h: 0.35, fontFace: face, fontSize: 11, color: MUTED_ON_DARK });

    const q = pptx.addSlide();
    q.background = { color: WHITE };
    q.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 0.9, fill: { color: INK_STRONG } });
    q.addShape(pptx.ShapeType.rect, { x: 0, y: 0.9, w: W, h: 0.05, fill: { color: ACCENT } });
    q.addText(wordmark(16, true), { x: 0.6, y: 0.22, w: 4, h: 0.5 });
    q.addText(isKo ? "공식 견적서" : "Official Quote", { x: 4.5, y: 0.22, w: 5, h: 0.5, fontFace: face, fontSize: 18, bold: true, color: WHITE });
    q.addText(`No. ${p.quoteNo}   ·   ${isKo ? "유효" : "Valid"} ${p.validUntil}`, { x: W - 5.1, y: 0.3, w: 4.5, h: 0.35, align: "right", fontFace: face, fontSize: 11, color: SOFT_ON_DARK });
    q.addTable(mediaTableRows(), { x: 0.6, y: 1.2, w: 8.4, colW: [3.9, 2.0, 1.25, 1.25], border: { type: "solid", color: "E4E6EC", pt: 0.5 }, rowH: 0.34, valign: "middle" });
    totalsBlock(q, 9.3, 1.2, 3.4);
    addStamp(q, 11.0, 5.6);
    q.addText(`${p.issuer.company}  ·  ${p.issuer.email}  ·  ${p.issuer.phone}`, { x: 0.6, y: 7.0, w: 9, h: 0.3, fontFace: face, fontSize: 9, color: GRAY });
    const buf = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
    return new Uint8Array(buf);
  }

  // ── 기본 견적서 ──
  const cover = pptx.addSlide();
  cover.background = { color: WHITE };
  cover.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.25, h: 7.5, fill: { color: ACCENT } });
  cover.addText(wordmark(26, false), { x: 0.7, y: 0.8, w: 6, h: 0.7 });
  cover.addText(isKo ? "광고 견적서" : "Advertising Quote", { x: 0.7, y: 1.7, w: 10, h: 0.9, fontFace: face, fontSize: 34, bold: true, color: INK });
  cover.addShape(pptx.ShapeType.rect, { x: 0.72, y: 2.75, w: 2, h: 0.06, fill: { color: ACCENT } });
  cover.addText(`${p.clientCompany} ${isKo ? "귀중" : ""}`.trim(), { x: 0.7, y: 3.1, w: 10, h: 0.5, fontFace: face, fontSize: 18, color: INK });
  cover.addText(
    [
      { text: `No. ${p.quoteNo}\n`, options: {} },
      { text: `${isKo ? "발행일" : "Issued"} ${p.issuedAt}\n`, options: {} },
      { text: `${isKo ? "유효기간" : "Valid until"} ${p.validUntil}`, options: {} },
    ].map((r) => ({ ...r, options: { ...r.options, fontFace: face, fontSize: 12, color: GRAY } })),
    { x: 0.7, y: 6.0, w: 8, h: 1.2 },
  );

  const s2 = pptx.addSlide();
  s2.background = { color: WHITE };
  s2.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 0.9, fill: { color: INK_STRONG } });
  s2.addShape(pptx.ShapeType.rect, { x: 0, y: 0.9, w: W, h: 0.05, fill: { color: ACCENT } });
  s2.addText(isKo ? "견적 내역" : "Quote details", { x: 0.6, y: 0.22, w: 8, h: 0.5, fontFace: face, fontSize: 18, bold: true, color: WHITE });
  s2.addText(`${p.clientCompany}  ·  ${p.periodLabel}`, { x: W - 5.1, y: 0.3, w: 4.5, h: 0.35, align: "right", fontFace: face, fontSize: 11, color: SOFT_ON_DARK });
  s2.addTable(mediaTableRows(), { x: 0.6, y: 1.2, w: 8.4, colW: [3.9, 2.0, 1.25, 1.25], border: { type: "solid", color: "E4E6EC", pt: 0.5 }, rowH: 0.36, valign: "middle" });
  totalsBlock(s2, 9.3, 1.2, 3.4);
  addStamp(s2, 11.0, 5.6);
  s2.addText(`${p.issuer.company}  ·  ${p.issuer.email}  ·  ${p.issuer.phone}\n${p.issuer.address}`, { x: 0.6, y: 6.7, w: 11, h: 0.6, fontFace: face, fontSize: 9, color: GRAY });

  const buf = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
  return new Uint8Array(buf);
}

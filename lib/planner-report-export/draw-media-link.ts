/** PDF·PPTX 매체 상세 바로가기 버튼 — 고대비(흰 배경 + 보라 텍스트) */

export function shortMediaUrl(url: string): string {
  return url.replace(/^https?:\/\//, "");
}

type PdfDoc = import("jspdf").jsPDF;

export function addPdfMediaDetailLink(
  doc: PdfDoc,
  opts: {
    x: number;
    y: number;
    w: number;
    label: string;
    url: string;
    font: string;
    violet: readonly [number, number, number];
    cyan: readonly [number, number, number];
  },
): number {
  const { x, y, w, label, url, font, violet, cyan } = opts;
  const btnH = 5.5;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(violet[0]!, violet[1]!, violet[2]!);
  doc.setLineWidth(0.35);
  doc.roundedRect(x, y, w, btnH, 1.1, 1.1, "FD");

  doc.setFont(font, "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(violet[0]!, violet[1]!, violet[2]!);
  const line = (doc.splitTextToSize(label, w - 2) as string[])[0] ?? label;
  doc.text(line, x + w / 2, y + 3.4, { align: "center" });

  try {
    const linkFn = (doc as PdfDoc & { link?: PdfDoc["link"] }).link;
    linkFn?.call(doc, x, y, w, btnH, { url });
  } catch {
    /* 링크 실패해도 문서 생성은 계속 */
  }

  const urlY = y + btnH + 1.2;
  doc.setFontSize(6.2);
  doc.setTextColor(cyan[0]!, cyan[1]!, cyan[2]!);
  const urlLine = (doc.splitTextToSize(shortMediaUrl(url), w) as string[])[0] ?? "";
  if (urlLine) {
    doc.text(urlLine, x + w / 2, urlY + 2.2, { align: "center" });
    try {
      const linkFn = (doc as PdfDoc & { link?: PdfDoc["link"] }).link;
      linkFn?.call(doc, x, urlY, w, 3.5, { url });
    } catch {
      /* ignore */
    }
  }

  return btnH + 5.5;
}

/** 카드형·컴팩트 타일 전체 클릭 영역 */
export function addPdfRectLink(
  doc: PdfDoc,
  opts: { x: number; y: number; w: number; h: number; url: string },
): void {
  try {
    const linkFn = (doc as PdfDoc & { link?: PdfDoc["link"] }).link;
    linkFn?.call(doc, opts.x, opts.y, opts.w, opts.h, { url: opts.url });
  } catch {
    /* 링크 실패해도 문서 생성은 계속 */
  }
}

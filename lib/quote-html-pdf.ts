/**
 * 견적서·기타 클라이언트 PDF — 공통 구현은 `html-to-pdf.ts`.
 */
export {
  htmlElementToPdf as quoteElementToPdf,
  htmlElementsToPdf as quoteElementsToPdf,
  downloadPdfFromHtmlElement as downloadQuotePdfFromElement,
  downloadPdfFromHtmlElements as downloadQuotePdfFromElements,
  htmlElementToPdfBase64 as quoteElementToPdfBase64,
  htmlElementsToPdfBase64 as quoteElementsToPdfBase64,
} from "@/lib/html-to-pdf";

/** html2canvas 캡처 전 scale/폭 해제 — 미리보기와 동일한 A4 레이아웃으로 PDF 생성 */
export async function runWithQuotePdfExport(
  el: HTMLElement | null,
  work: () => Promise<void>,
) {
  if (!el) throw new Error("no preview");
  const wrap = el.closest("[data-quote-pdf-scale-wrap]");
  wrap?.setAttribute("data-quote-pdf-exporting", "true");
  await new Promise<void>((r) =>
    requestAnimationFrame(() => requestAnimationFrame(() => r())),
  );
  await new Promise<void>((r) => setTimeout(r, 80));
  try {
    await work();
  } finally {
    wrap?.removeAttribute("data-quote-pdf-exporting");
  }
}

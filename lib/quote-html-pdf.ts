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

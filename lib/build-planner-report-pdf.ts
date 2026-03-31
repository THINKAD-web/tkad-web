/**
 * Planner report PDF — implementation is shared with the live preview
 * (`PlannerReportPreview` + `htmlElementToPdf` in `html-to-pdf`).
 * This module re-exports the same helpers for a stable import path.
 */
export {
  defaultPlannerPdfFilename,
  downloadPdfFromHtmlElement,
  htmlElementToPdf,
  htmlElementToPdfBase64,
} from "./html-to-pdf";

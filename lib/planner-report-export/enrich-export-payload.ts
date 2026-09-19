import {
  getPlannerDocumentTypeConfig,
  type PlannerDocumentTypeKey,
} from "@/lib/planner-report-export/document-type";
import type { PlannerReportExportPayload } from "@/lib/planner-report-export/types";

/** UI 편집·문서유형 피커 → export/PDF 공통 payload 덮어쓰기 */
export function applyPlannerDocumentTypeToPayload(
  payload: PlannerReportExportPayload,
  opts: {
    isKo: boolean;
    documentType: PlannerDocumentTypeKey;
    documentTitleOverride?: string;
    clientName?: string;
    coverLogoUrl?: string | null;
    greetingText?: string;
    executiveSummaryLines?: string[];
  },
): PlannerReportExportPayload {
  const config = getPlannerDocumentTypeConfig(opts.documentType);
  const dtTitle = opts.isKo ? config.titleKo : config.titleEn;
  const compositionTitle =
    payload.reportComposition === "mixed" ||
    payload.reportComposition === "onlyOnline"
      ? payload.documentTitle
      : undefined;

  return {
    ...payload,
    documentTitle:
      compositionTitle ??
      (opts.documentTitleOverride?.trim() || dtTitle),
    documentTypeWord: opts.isKo
      ? config.fileNameWordKo
      : config.fileNameWordEn,
    clientName: opts.clientName?.trim() || payload.clientName,
    coverLogoUrl: opts.coverLogoUrl?.trim() || payload.coverLogoUrl,
    greetingText:
      opts.greetingText?.trim() || payload.greetingText || undefined,
    executiveSummaryLines:
      opts.executiveSummaryLines && opts.executiveSummaryLines.length > 0
        ? opts.executiveSummaryLines
        : payload.executiveSummaryLines,
  };
}

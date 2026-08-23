import { formatExportBudgetWonLabel } from "@/lib/planner-report-export/format-export-money";
import { isQuoteOnlyMedia } from "@/lib/media-pricing-mode";
import type { MediaItem } from "@/lib/media-data";

/** 보고서·PDF·PPTX — 예산 셀 (협의가 → 문의) */
export function formatExportBudgetWonLabelForMedia(
  m: MediaItem,
  won: number,
  isKo: boolean,
): string {
  if (isQuoteOnlyMedia(m)) {
    return formatExportBudgetWonLabel(0, isKo);
  }
  return formatExportBudgetWonLabel(won, isKo);
}

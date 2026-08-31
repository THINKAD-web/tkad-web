/**
 * 커스텀 mix → PDF/PPTX export row 변환.
 */

import type { CampaignPlanCustomMixEntry } from "@/lib/campaign-plan-mix-entry";
import { customMixEntryTotalWon } from "@/lib/campaign-plan-mix-entry";
import type { PlannerExportMediaRow } from "@/lib/planner-report-export/types";
import { formatExportBudgetWonLabel } from "@/lib/planner-report-export/format-export-money";

export function customMixEntryToExportRow(
  entry: CampaignPlanCustomMixEntry,
  isKo: boolean,
): PlannerExportMediaRow {
  const totalWon = customMixEntryTotalWon(entry);
  const unitLabel = formatExportBudgetWonLabel(entry.unitPriceWon, isKo);
  return {
    id: entry.lineId,
    kind: "custom",
    name: entry.name,
    categoryLabel: isKo ? "커스텀 · 카탈로그 외" : "Custom · off-catalog",
    quantityLabel: isKo
      ? `×${entry.quantity} · ${unitLabel}/단위`
      : `×${entry.quantity} · ${unitLabel} each`,
    lineTotalLabel: formatExportBudgetWonLabel(totalWon, isKo),
    metricsUnavailableLabel: isKo ? "산정 불가" : "N/A",
    notes: entry.notes,
  };
}

export function customMixEntriesToExportRows(
  entries: readonly CampaignPlanCustomMixEntry[],
  isKo: boolean,
): PlannerExportMediaRow[] {
  return entries.map((e) => customMixEntryToExportRow(e, isKo));
}

export function isCustomExportMediaRow(
  row: PlannerExportMediaRow,
): boolean {
  return row.kind === "custom";
}

import { campaignBuilderCopy } from "@/lib/admin-campaign-builder/copy-ko";
import type { PlannerReportExportPayload } from "@/lib/planner-report-export/types";

/** Structural snapshot for preview ↔ PDF parity tests (STEP3e). */
export type BuilderPreviewSnapshot = {
  sectionOrder: string[];
  digitalLineCount: number;
  oohLineCount: number;
  customLineCount: number;
  digitalLineNames: string[];
  oohLineNames: string[];
  customLineNames: string[];
  totalBudgetLabel: string | null;
  chartLabels: string[];
  documentType: "proposal" | "report";
};

export function extractBuilderPreviewSnapshot(
  exportPayload: PlannerReportExportPayload,
): BuilderPreviewSnapshot {
  const bs = exportPayload.builderSection;
  if (!bs) {
    throw new Error("builderSection missing on export payload");
  }

  const copy = campaignBuilderCopy[bs.documentType];
  const sectionOrder: string[] = ["cover", "kpi"];

  if (bs.digitalLines.length > 0) {
    sectionOrder.push(copy.sectionTitles.estimateProducts);
  }
  if (bs.oohLines.length > 0) {
    sectionOrder.push("ooh");
  }
  if (bs.customLines.length > 0) {
    sectionOrder.push(copy.sectionTitles.executionGroup);
  }
  if ((bs.charts.budgetSplit?.length ?? 0) > 0) {
    sectionOrder.push("budget-chart");
  }
  if (bs.insights) {
    sectionOrder.push(copy.sectionTitles.insightsGroup);
  }

  const totalBudgetLabel =
    exportPayload.kpis.find((k) => k.label === copy.kpiLabels.totalBudget)
      ?.value ?? null;

  return {
    sectionOrder,
    digitalLineCount: bs.digitalLines.length,
    oohLineCount: bs.oohLines.length,
    customLineCount: bs.customLines.length,
    digitalLineNames: bs.digitalLines.map((l) => l.name),
    oohLineNames: bs.oohLines.map((l) => l.name),
    customLineNames: bs.customLines.map((l) => l.name),
    totalBudgetLabel,
    chartLabels: (bs.charts.budgetSplit ?? []).map((d) => d.label),
    documentType: bs.documentType,
  };
}

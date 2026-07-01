import type { PlannerExportMediaRow } from "@/lib/planner-report-export/types";

export type MediaCardSpec = { label: string; value: string };

export function collectMediaCardSpecs(
  row: PlannerExportMediaRow,
  isKo: boolean,
): MediaCardSpec[] {
  const specs: MediaCardSpec[] = [];
  if (row.size) specs.push({ label: isKo ? "규격" : "Size", value: row.size });
  if (row.operatingHours) {
    specs.push({ label: isKo ? "운영시간" : "Hours", value: row.operatingHours });
  }
  if (row.dailyTraffic && row.dailyTraffic > 0) {
    specs.push({
      label: isKo ? "일일 노출" : "Daily reach",
      value: `${row.dailyTraffic.toLocaleString(isKo ? "ko-KR" : "en-US")}${isKo ? "회" : ""}`,
    });
  }
  if (row.broadcastLabel) {
    specs.push({ label: isKo ? "송출" : "Spot", value: row.broadcastLabel });
  }
  return specs;
}

export function showMediaCardContributions(
  portfolioLen: number,
  row: PlannerExportMediaRow,
): boolean {
  return (
    portfolioLen > 1 &&
    (row.exposureContributionPct != null || row.budgetContributionPct != null)
  );
}

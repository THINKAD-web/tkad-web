import type { PlannerExportMediaRow } from "@/lib/planner-report-export/types";

export type MediaCardSpec = { label: string; value: string };

export function exportMediaLineMetaParts(
  row: PlannerExportMediaRow,
  opts?: { includePrice?: boolean },
): string[] {
  const parts: string[] = [];
  if (row.region) parts.push(row.region);
  const typeLabel = row.type ?? row.categoryLabel;
  if (typeLabel) parts.push(typeLabel);
  if (row.quantityLabel) parts.push(row.quantityLabel);
  if (opts?.includePrice) {
    const price = row.monthlyPriceLabel ?? row.priceLabel;
    if (price) parts.push(price);
  }
  return parts;
}

export function collectMediaCardSpecs(
  row: PlannerExportMediaRow,
  isKo: boolean,
): MediaCardSpec[] {
  if (row.kind === "custom") {
    const specs: MediaCardSpec[] = [];
    if (row.quantityLabel) {
      specs.push({ label: isKo ? "수량·단가" : "Qty · unit", value: row.quantityLabel });
    }
    if (row.metricsUnavailableLabel) {
      specs.push({
        label: isKo ? "노출·CPM" : "Impressions·CPM",
        value: row.metricsUnavailableLabel,
      });
    }
    return specs;
  }
  const specs: MediaCardSpec[] = [];
  if (row.quantityLabel) {
    specs.push({ label: isKo ? "수량" : "Qty", value: row.quantityLabel });
  }
  if (row.size) specs.push({ label: isKo ? "규격" : "Size", value: row.size });
  if (row.operatingHours) {
    specs.push({ label: isKo ? "운영시간" : "Hours", value: row.operatingHours });
  }
  if (row.dailyTraffic && row.dailyTraffic > 0) {
    specs.push({
      label: isKo ? "일 유동인구" : "Daily footfall",
      value: `${row.dailyTraffic.toLocaleString(isKo ? "ko-KR" : "en-US")}${isKo ? "회" : ""}`,
    });
  }
  if (row.adjustedDailyReach && row.adjustedDailyReach > 0) {
    specs.push({
      label: isKo ? "일 실노출(추정)" : "Daily reach (est.)",
      value: `${row.adjustedDailyReach.toLocaleString(isKo ? "ko-KR" : "en-US")}${isKo ? "회" : ""}`,
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
  if (row.kind === "custom") return false;
  return (
    portfolioLen > 1 &&
    (row.exposureContributionPct != null || row.budgetContributionPct != null)
  );
}

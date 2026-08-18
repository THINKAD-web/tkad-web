import type { PlannerExportKpi } from "@/lib/planner-report-export/types";

export const EXPORT_KPI_PENDING_HINT_KO =
  "행정동 인구 데이터 연동 후 제공";
export const EXPORT_KPI_PENDING_HINT_EN =
  "Available after dong population data is connected";

export const EXPORT_DIGITAL_OMITTED_KO =
  "디지털 채널 배분은 이번 보고서에 포함되지 않았습니다.";
export const EXPORT_DIGITAL_OMITTED_EN =
  "Digital channel allocation is not included in this report.";

export function exportKpiValue(label: string, value: string): PlannerExportKpi {
  return { label, value, status: "value" };
}

export function exportKpiPending(label: string, isKo: boolean): PlannerExportKpi {
  return {
    label,
    value: "—",
    status: "pending",
    badgeLabel: isKo ? "산정 중" : "Pending",
    pendingHint: isKo ? EXPORT_KPI_PENDING_HINT_KO : EXPORT_KPI_PENDING_HINT_EN,
  };
}

export function exportReachPendingLine(isKo: boolean): string {
  return isKo
    ? "핵심 타깃 도달률은 행정동 인구 데이터 연동 후 제공됩니다."
    : "Core reach will be available after dong-level population data is connected.";
}

export function exportRoiPendingLine(isKo: boolean): string {
  return isKo
    ? "기대 ROI는 행정동 인구 데이터 연동 후 제공됩니다."
    : "Expected ROI will be available after dong-level population data is connected.";
}

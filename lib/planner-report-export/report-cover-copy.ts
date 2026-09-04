import type { PlannerReportComposition } from "@/lib/planner-report-export/types";

type CoverSubtitleInput = {
  kind?: "ooh" | "integrated";
  reportComposition?: PlannerReportComposition;
};

/** HTML 미리보기 표지 부제 (날짜는 호출측에서 ` · ${generatedAt}` 붙임) */
export function reportCoverSubtitle(
  isKo: boolean,
  input: CoverSubtitleInput,
): string {
  if (input.kind === "integrated") {
    return isKo ? "OOH + 디지털 통합 제안" : "OOH + Digital integrated";
  }
  switch (input.reportComposition) {
    case "onlyOnline":
      return isKo ? "온라인 매체 플랜" : "Online media plan";
    case "mixed":
      return isKo ? "OOH + 온라인 통합 제안" : "OOH + Online integrated";
    default:
      return isKo ? "OOH 미디어 플랜" : "OOH media plan";
  }
}

/** PDF/PPTX 표지 부제 */
export function reportExportCoverSubtitle(
  isKo: boolean,
  input: CoverSubtitleInput,
): string {
  if (input.kind === "integrated") {
    return isKo
      ? "OOH + 디지털 통합 캠페인 제안서"
      : "OOH + Digital integrated campaign";
  }
  switch (input.reportComposition) {
    case "onlyOnline":
      return isKo ? "온라인 매체 캠페인 플랜" : "Online media campaign plan";
    case "mixed":
      return isKo
        ? "OOH + 온라인 통합 캠페인 제안"
        : "OOH + Online integrated campaign";
    default:
      return isKo ? "OOH 미디어 캠페인 플랜" : "OOH media campaign plan";
  }
}

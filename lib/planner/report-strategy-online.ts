import type { PlannerCampaignGoal } from "@/lib/planner-logic";
import type { PlannerIndustryKey } from "@/lib/planner/types";

export type OnlineReportStrategyInput = {
  isKo: boolean;
  campaignGoal: PlannerCampaignGoal | null;
  goalTitle: string;
  industryKey: PlannerIndustryKey | null;
  industryText: string;
  onlineLineCount: number;
  calculableLineCount: number;
  inquiryLineCount: number;
};

/**
 * Online-only strategy copy — OOH `report-strategy.ts` functions are untouched.
 */
export function buildOnlineReportStrategyLines(
  input: OnlineReportStrategyInput,
): string[] {
  const lines: string[] = [];
  const { isKo, goalTitle, industryText, onlineLineCount, calculableLineCount } =
    input;

  if (isKo) {
    lines.push(
      `${goalTitle} 목표에 맞춰 ${onlineLineCount}개 온라인 채널을 구성했습니다.`,
    );
    if (industryText && industryText !== "미지정") {
      lines.push(`${industryText} 업종 특성에 맞는 플랫폼·과금 조합을 반영했습니다.`);
    }
    if (calculableLineCount > 0) {
      lines.push(
        "CPC·CPM 참고 단가와 월 예산을 바탕으로 예상 도달·클릭 범위를 산출했습니다.",
      );
    }
  } else {
    lines.push(
      `This plan combines ${onlineLineCount} online channel(s) for the "${goalTitle}" objective.`,
    );
    if (industryText && industryText !== "Not specified") {
      lines.push(`Platform and billing mix reflects ${industryText} category norms.`);
    }
    if (calculableLineCount > 0) {
      lines.push(
        "Estimated reach and clicks derive from catalog CPC/CPM ranges applied to monthly budgets.",
      );
    }
  }

  return lines;
}

export function buildOnlineReportWhyLine(input: OnlineReportStrategyInput): string {
  if (input.isKo) {
    return `왜 이 구성인가 · ${input.onlineLineCount}개 온라인 채널로 ${input.goalTitle} 목표에 맞춘 예산·성과 범위를 제안합니다.`;
  }
  return `Why · ${input.onlineLineCount} online channel(s) aligned to "${input.goalTitle}" with budget-scoped performance ranges.`;
}

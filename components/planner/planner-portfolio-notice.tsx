"use client";

import { AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  isKo: boolean;
  /** 직접 담은 매체 수 */
  selectedCount: number;
  /** 설계·보고서에 포함된 매체 수 */
  inPlanCount: number;
  overBudget: boolean;
  monthlyTotalMan: number;
  monthlyBudgetMan: number;
  /** AI 자동 조합 여부 */
  isAutoMix?: boolean;
  autoMixMax?: number;
  /** ID는 있으나 카탈로그에서 찾지 못한 개수 */
  unresolvedCount?: number;
  className?: string;
};

export function PlannerPortfolioNotice({
  isKo,
  selectedCount,
  inPlanCount,
  overBudget,
  monthlyTotalMan,
  monthlyBudgetMan,
  isAutoMix = false,
  autoMixMax = 12,
  unresolvedCount = 0,
  className,
}: Props) {
  const lines: string[] = [];

  if (isAutoMix) {
    lines.push(
      isKo
        ? `직접 선택한 매체가 없어 AI가 예산·효율 기준으로 최대 ${autoMixMax}개 매체를 자동 조합했습니다. 4단계에서 매체를 담으면 그 구성이 보고서에 반영됩니다.`
        : `No manual picks — AI auto-selected up to ${autoMixMax} media for your budget. Add media in step 4 to override.`,
    );
  } else if (selectedCount > 0 && inPlanCount === selectedCount) {
    lines.push(
      isKo
        ? `직접 선택한 ${selectedCount}개 매체가 모두 설계·보고서에 반영됩니다.`
        : `All ${selectedCount} selected media are included in the plan and report.`,
    );
  } else if (selectedCount > inPlanCount) {
    lines.push(
      isKo
        ? `선택 ${selectedCount}개 중 ${inPlanCount}개만 설계에 포함됩니다.`
        : `${inPlanCount} of ${selectedCount} selected media are in the plan.`,
    );
  }

  if (unresolvedCount > 0) {
    lines.push(
      isKo
        ? `${unresolvedCount}개 매체 정보를 불러오지 못했습니다. 페이지를 새로고침하거나 4단계에서 다시 담아 주세요.`
        : `Could not load ${unresolvedCount} media. Refresh or re-add them in step 4.`,
    );
  }

  if (overBudget) {
    lines.push(
      isKo
        ? `선택 매체 월 단가 합 약 ${Math.round(monthlyTotalMan).toLocaleString("ko-KR")}만원이 월 예산 ${Math.round(monthlyBudgetMan).toLocaleString("ko-KR")}만원을 초과합니다. 견적·집행 전 조정이 필요할 수 있습니다.`
        : `Selected media total ~${Math.round(monthlyTotalMan).toLocaleString("en-US")}M KRW/month exceeds the ${Math.round(monthlyBudgetMan).toLocaleString("en-US")}M/month budget. Adjust before quoting.`,
    );
  }

  if (lines.length === 0) return null;

  const isWarning =
    overBudget ||
    unresolvedCount > 0 ||
    isAutoMix ||
    (selectedCount > inPlanCount && !isAutoMix);

  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl border px-4 py-3 text-sm leading-relaxed",
        isWarning
          ? "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"
          : "border-violet-200 bg-violet-50/80 text-violet-950 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-100",
        className,
      )}
      role="note"
    >
      {isWarning ? (
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
      ) : (
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-violet-600 dark:text-violet-400" />
      )}
      <ul className="min-w-0 space-y-1.5">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

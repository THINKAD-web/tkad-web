"use client";

import type { MediaItem } from "@/lib/media-data";
import type { PlannerCampaignGoal } from "@/lib/planner-logic";
import type { PlannerGoalFollowUp } from "@/lib/planner/goal-follow-up";
import { buildGoalFollowUpReportLines } from "@/lib/planner/goal-follow-up";
import { PlannerNeonLabel, plannerNeon } from "@/components/planner/planner-neon-ui";
import { cn } from "@/lib/utils";

type Props = {
  isKo: boolean;
  goalTitle: string;
  campaignGoal?: PlannerCampaignGoal | null;
  goalFollowUp?: PlannerGoalFollowUp;
  budgetNum: number;
  periodDisplay: string;
  regionsText: string;
  categoriesText: string;
  ageText: string;
  industryText: string;
  portfolio: MediaItem[];
};

export function PlannerReportFreeSummary({
  isKo,
  goalTitle,
  campaignGoal = null,
  goalFollowUp = {},
  budgetNum,
  periodDisplay,
  regionsText,
  categoriesText,
  ageText,
  industryText,
  portfolio,
}: Props) {
  const goalContextLines = buildGoalFollowUpReportLines(
    campaignGoal,
    goalFollowUp,
    isKo,
  );

  return (
    <div className="space-y-4">
      <div className={cn(plannerNeon.card, "rounded-[22px] px-4 py-3 text-sm")}>
        <PlannerNeonLabel className="mb-2 block">
          {isKo ? "캠페인 정보" : "Campaign info"}
        </PlannerNeonLabel>
        <p className="text-base font-bold text-gray-900 dark:text-white">{goalTitle}</p>
        {goalContextLines.length > 0 ? (
          <ul className="mt-2 space-y-1 text-sm text-gray-700 dark:text-white/85">
            {goalContextLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}
        <p className="mt-2 text-sm text-gray-700 dark:text-white/85">
          {isKo ? "예산" : "Budget"}: ₩{budgetNum.toLocaleString()}
          {isKo ? "만" : "M"} · {periodDisplay}
        </p>
        <p className="mt-1 text-sm text-gray-700 dark:text-white/85">
          {regionsText} · {categoriesText}
        </p>
        <p className="mt-1 text-sm text-gray-700 dark:text-white/85">
          {ageText} · {industryText}
        </p>
      </div>

      <div className={cn(plannerNeon.card, "rounded-[22px] p-4")}>
        <PlannerNeonLabel className="mb-3 block">
          {isKo ? "선택 매체" : "Selected media"} ({portfolio.length})
        </PlannerNeonLabel>
        <ul className="space-y-1.5">
          {portfolio.map((m) => (
            <li
              key={m.id}
              className="text-sm font-semibold leading-snug text-gray-900 dark:text-white"
            >
              · {isKo ? m.name : m.nameEn || m.name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

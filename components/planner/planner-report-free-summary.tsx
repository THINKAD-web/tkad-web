"use client";

import type { MediaItem } from "@/lib/media-data";
import { PlannerNeonLabel, plannerNeon } from "@/components/planner/planner-neon-ui";
import { cn } from "@/lib/utils";

type Props = {
  isKo: boolean;
  goalTitle: string;
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
  budgetNum,
  periodDisplay,
  regionsText,
  categoriesText,
  ageText,
  industryText,
  portfolio,
}: Props) {
  return (
    <div className="space-y-4">
      <div className={cn(plannerNeon.card, "rounded-[22px] px-4 py-3 text-sm")}>
        <PlannerNeonLabel className="mb-2 block">
          {isKo ? "캠페인 정보" : "Campaign info"}
        </PlannerNeonLabel>
        <p className={plannerNeon.headline}>{goalTitle}</p>
        <p className={cn("mt-2", plannerNeon.subtext)}>
          {isKo ? "예산" : "Budget"}: ₩{budgetNum.toLocaleString()}
          {isKo ? "만" : "M"} · {periodDisplay}
        </p>
        <p className={cn("mt-1", plannerNeon.subtext)}>
          {regionsText} · {categoriesText}
        </p>
        <p className={cn("mt-1", plannerNeon.subtext)}>
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
              className="text-sm font-medium text-gray-800 dark:text-white/90"
            >
              · {isKo ? m.name : m.nameEn || m.name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

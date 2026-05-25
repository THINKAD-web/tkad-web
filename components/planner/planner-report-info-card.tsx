"use client";

import { cn } from "@/lib/utils";

type Props = {
  isKo: boolean;
  className?: string;
};

export function PlannerReportInfoCard({ isKo, className }: Props) {
  return (
    <div
      className={cn(
        "mb-4 rounded-xl border p-4",
        "bg-blue-50 border-blue-200 dark:bg-white/5 dark:border-white/10",
        className,
      )}
      data-screenshot="planner-report-info-card"
    >
      <p className="text-sm font-semibold text-gray-900 dark:text-white">
        {isKo ? "💡 이 보고서는 화면 요약본입니다" : "💡 This report is an on-screen summary"}
      </p>
      <ul className="mt-2 space-y-1 text-sm text-gray-600 dark:text-white/70">
        <li>
          {isKo ? "화면: 기본 정보 + 노출 추정" : "On-screen: basics + impression estimate"}
        </li>
        <li>
          {isKo ? "PDF (PRO): 상세 시뮬레이션 포함" : "PDF (PRO): detailed simulation included"}
        </li>
        <li className="text-gray-500 dark:text-white/50">
          {isKo ? "→ 대행사 PT·비딩용 자료" : "→ For agency pitches and bidding"}
        </li>
      </ul>
    </div>
  );
}

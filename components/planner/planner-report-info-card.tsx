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
        "rounded-xl border p-4",
        "bg-blue-50 border-blue-200 dark:bg-white/5 dark:border-white/10",
        className,
      )}
      data-screenshot="planner-report-info-card"
    >
      <p className="text-sm font-semibold text-gray-900 dark:text-white">
        {isKo ? "💡 이 보고서는 무엇인가요?" : "💡 What is this report?"}
      </p>

      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-300">
            {isKo ? "화면 보고서 (현재 페이지)" : "On-screen report (this page)"}
          </p>
          <ul className="mt-2 space-y-1 text-sm text-gray-600 dark:text-white/70">
            <li>{isKo ? "✓ 캠페인 플랜 요약" : "✓ Campaign plan summary"}</li>
            <li>{isKo ? "✓ 매체별 기본 정보" : "✓ Basic media info"}</li>
            <li>{isKo ? "✓ 대략적 노출 추정" : "✓ Rough impression estimate"}</li>
            <li className="text-gray-400 dark:text-white/40">
              {isKo ? "✗ 상세 시뮬레이션 (PRO)" : "✗ Detailed simulation (PRO)"}
            </li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-600 dark:text-cyan-300">
            {isKo ? "PDF 플래너 보고서 (PRO)" : "PDF planner report (PRO)"}
          </p>
          <ul className="mt-2 space-y-1 text-sm text-gray-600 dark:text-white/70">
            <li>{isKo ? "✓ 위 내용 모두 포함" : "✓ Everything above included"}</li>
            <li>{isKo ? "✓ 노출 패턴 상세 차트" : "✓ Exposure pattern charts"}</li>
            <li>{isKo ? "✓ OTS·CPM·Reach 시뮬레이션" : "✓ OTS · CPM · Reach simulation"}</li>
            <li>{isKo ? "✓ 예산 배분 최적화 분석" : "✓ Budget allocation analysis"}</li>
            <li>{isKo ? "✓ 클라이언트 제출용 PDF" : "✓ Client-ready PDF export"}</li>
          </ul>
          <p className="mt-2 text-xs text-gray-500 dark:text-white/45">
            {isKo
              ? "→ 대행사 PT·비딩 자료로 활용 가능"
              : "→ Use for agency pitches and bidding"}
          </p>
        </div>
      </div>
    </div>
  );
}

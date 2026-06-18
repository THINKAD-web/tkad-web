"use client";

import { formatPlannerSharePct } from "@/lib/planner-logic";
import type { PlannerExportRegionBreakdown } from "@/lib/planner-report-export/types";
import { cn } from "@/lib/utils";

type Props = {
  rows: PlannerExportRegionBreakdown[];
  isKo: boolean;
  className?: string;
};

function fmtWon(n: number, isKo: boolean) {
  return isKo
    ? `${n.toLocaleString("ko-KR")}원`
    : `₩${n.toLocaleString("en-US")}`;
}

export function PlanCartRegionalBreakdown({ rows, isKo, className }: Props) {
  if (rows.length === 0) return null;

  const multiRegion = rows.length > 1;

  return (
    <section
      className={cn("space-y-4", className)}
      aria-labelledby="plan-regional-breakdown-heading"
    >
      <div>
        <p className="font-display text-xs font-medium uppercase tracking-[0.18em] text-cyan-600/80 dark:text-cyan-300/70">
          {isKo ? "지역별 요약" : "By region"}
        </p>
        <h2
          id="plan-regional-breakdown-heading"
          className="mt-1 text-lg font-bold text-gray-900 dark:text-white"
        >
          {multiRegion
            ? isKo
              ? "지역별 예산 · 예상 효과"
              : "Budget & estimated impact by region"
            : isKo
              ? "지역 예산 · 예상 효과"
              : "Regional budget & impact"}
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-white/55">
          {isKo
            ? "담은 매체를 지역 단위로 묶어 월 예산·노출·추정 도달을 비교합니다."
            : "Grouped by region: monthly spend, impressions, and estimated reach."}
        </p>
      </div>

      <div
        className={cn(
          "grid gap-4",
          rows.length >= 3
            ? "sm:grid-cols-2 xl:grid-cols-3"
            : rows.length === 2
              ? "sm:grid-cols-2"
              : "grid-cols-1",
        )}
      >
        {rows.map((row) => (
          <article
            key={row.regionKey}
            className="flex min-h-0 flex-col rounded-2xl border border-gray-200 bg-white/80 p-4 dark:border-white/12 dark:bg-white/5"
          >
            <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-3 dark:border-white/10">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                {row.label}
              </h3>
              <span className="shrink-0 rounded-full bg-violet-500/15 px-2.5 py-0.5 text-[10px] font-bold text-violet-700 dark:text-violet-200">
                {isKo ? `매체 ${row.mediaCount}개` : `${row.mediaCount} media`}
              </span>
            </div>

            <dl className="mt-3 grid flex-1 gap-x-4 gap-y-2.5 text-sm sm:grid-cols-2">
              <div className="sm:col-span-2">
                <dt className="text-xs text-gray-500 dark:text-white/50">
                  {isKo ? "월 예산" : "Monthly"}
                </dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-gray-900 dark:text-white">
                  {fmtWon(row.monthlyBudgetWon, isKo)}
                  {multiRegion ? (
                    <span className="ml-1.5 text-xs font-normal text-violet-600 dark:text-violet-300">
                      {formatPlannerSharePct(row.budgetPct)}
                    </span>
                  ) : null}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-gray-500 dark:text-white/50">
                  {isKo ? "기간 예산" : "Period spend"}
                </dt>
                <dd className="mt-0.5 font-medium tabular-nums text-gray-800 dark:text-white/90">
                  {fmtWon(row.periodBudgetWon, isKo)}
                </dd>
              </div>
              <div className="border-t border-gray-100 pt-2 sm:col-span-2 dark:border-white/10">
                <dt className="text-xs text-gray-500 dark:text-white/50">
                  {isKo ? "월 노출" : "Monthly imp."}
                </dt>
                <dd className="mt-0.5 font-semibold tabular-nums tkad-home-accent-text">
                  {row.monthlyImpressions.toLocaleString(isKo ? "ko-KR" : "en-US")}
                  {multiRegion ? (
                    <span className="ml-1.5 text-xs font-normal text-gray-500 dark:text-white/45">
                      {formatPlannerSharePct(row.impressionPct)}
                    </span>
                  ) : null}
                </dd>
              </div>
              {row.uniqueReach > 0 ? (
                <div>
                  <dt className="text-xs text-gray-500 dark:text-white/50">
                    {isKo ? "추정 도달" : "Est. reach"}
                  </dt>
                  <dd className="mt-0.5 font-medium tabular-nums text-gray-800 dark:text-white/90">
                    {row.uniqueReach.toLocaleString(isKo ? "ko-KR" : "en-US")}
                    {isKo ? "명" : ""}
                  </dd>
                </div>
              ) : null}
              {row.cpmKrw != null && row.cpmKrw > 0 ? (
                <div>
                  <dt className="text-xs text-gray-500 dark:text-white/50">CPM</dt>
                  <dd className="mt-0.5 font-medium tabular-nums text-gray-800 dark:text-white/90">
                    ₩{row.cpmKrw.toLocaleString(isKo ? "ko-KR" : "en-US")}
                  </dd>
                </div>
              ) : null}
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}

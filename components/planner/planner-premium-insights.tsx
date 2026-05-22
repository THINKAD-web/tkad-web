"use client";

import type { PlannerPremiumInsights } from "@/lib/planner-report-insights";
import type { AccessCheckResult } from "@/lib/report-access-shared";
import { ReportAccessGate } from "@/components/report-access-gate";

type Props = {
  insights: PlannerPremiumInsights;
  isKo: boolean;
  access: AccessCheckResult;
};

export function PlannerPremiumInsightsPanel({ insights, isKo, access }: Props) {
  const content = (
    <div className="space-y-8 border-2 border-border bg-card p-5 sm:p-6">
      <div>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
          [ {isKo ? "캠페인 타임라인" : "Campaign timeline"} ]
        </p>
        <div className="relative mt-4 h-12 rounded-2xl bg-muted/40">
          {insights.gantt.map((row) => (
            <div
              key={row.mediaId}
              className="absolute top-1 bottom-1 flex items-center overflow-hidden rounded-md px-2 text-[10px] font-bold dark:text-white text-gray-900"
              style={{
                left: `${row.startPct}%`,
                width: `${row.widthPct}%`,
                backgroundColor: row.color,
              }}
              title={row.name}
            >
              <span className="truncate">{row.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
          [ {isKo ? "예산 배분 추천" : "Budget allocation"} ]
        </p>
        <p className="mt-2 text-sm font-semibold text-foreground">
          {isKo ? insights.budgetSummaryKo : insights.budgetSummaryEn}
        </p>
        <ul className="mt-3 space-y-2">
          {insights.budgetRecs.map((r) => (
            <li
              key={r.label}
              className="rounded-lg border border-border bg-background px-3 py-2 text-xs"
            >
              <span className="font-bold text-primary">{r.label} {r.pct}%</span>
              <span className="mt-0.5 block text-muted-foreground">
                {isKo ? r.reasonKo : r.reasonEn}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-background p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {isKo ? "온라인 광고 비교" : "vs digital ads"}
          </p>
          <p className="mt-2 text-sm leading-relaxed">
            {isKo ? insights.online.summaryKo : insights.online.summaryEn}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-background p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {isKo ? "브랜드 리프트 예측" : "Brand lift forecast"}
          </p>
          <p className="mt-2 text-2xl font-black text-primary">
            +{insights.brandLift.pctMin}~{insights.brandLift.pctMax}%
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {isKo ? insights.brandLift.industryKo : insights.brandLift.industryEn}{" "}
            {isKo ? "업종 평균 기반" : "industry benchmark"}
          </p>
        </div>
      </div>

      <div>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
          [ {isKo ? "경쟁사 노출 분석" : "Competitor exposure"} ]
        </p>
        <ul className="mt-3 space-y-2">
          {insights.competitorExposure.map((row) => (
            <li
              key={row.mediaName}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
            >
              <span>
                {row.mediaName}
                <span className="ml-2 text-xs text-muted-foreground">
                  ({row.industryKo})
                </span>
              </span>
              <span className="font-bold">{row.sharePct}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  return (
    <ReportAccessGate access={access} feature="simulation_full" isKo={isKo}>
      {content}
    </ReportAccessGate>
  );
}

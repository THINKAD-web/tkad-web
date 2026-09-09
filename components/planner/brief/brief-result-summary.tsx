"use client";

/**
 * Step 3 상단 "한눈에 요약" 카드 — 광고를 모르는 사용자용.
 *
 * 게이트 없음(무료 사용자도 항상 노출) — `reportPreviewAllowed` 같은 티어
 * 체크를 이 컴포넌트에는 절대 넣지 않는다. 아래 실시간 지표 패널·확정 믹스
 * 표는 그대로 유지되며, 이 카드는 그 위에 얹히는 요약일 뿐이다.
 *
 * 도넛 색상은 `lib/planner-chart-colors.ts` 를 그대로 쓴다 — PDF 제안서와
 * 같은 색으로 유형을 인식하게 하기 위해서다. 다만 그 팔레트는 라이트 테마
 * 인쇄물 전용(`#1c1c1f` 근흑색 등)이라, 이 카드는 앱 다크모드 위에서도 쓰이므로
 * 근흑색 하나만 다크에서 중립 회색으로 바꿔 보이게 한다(다른 색은 다크에서도
 * 그대로 잘 보인다).
 */

import type { PlannerExportChartDatum } from "@/lib/planner-report-export/types";
import { BudgetSplitDonut } from "@/components/planner/budget-split-donut";
import { formatReach } from "@/components/planner/brief/metrics-panel";
import { plannerNeon } from "@/components/planner/planner-neon-ui";
import { buildPlainLanguageSummary } from "@/lib/planner/brief/plain-language-summary";

export function BriefResultSummary({
  isKo,
  budgetWon,
  totalImpressions,
  netReach,
  mediaCount,
  days,
  targetLine,
  budgetSplit,
}: {
  isKo: boolean;
  budgetWon: number;
  totalImpressions: number;
  /** null = 도달 산정 중(커버리지 데이터 없음) — MetricsPanel 의 pending 처리와 동일 */
  netReach: number | null;
  mediaCount: number;
  days: number;
  targetLine: string;
  budgetSplit?: readonly PlannerExportChartDatum[];
}) {
  const sentence = buildPlainLanguageSummary({
    isKo,
    budgetWon,
    totalImpressions,
    netReach,
    formatCompact: formatReach,
  });
  const hasDonut = (budgetSplit?.length ?? 0) > 0;

  return (
    <section
      className="rounded-xl border border-primary/40 bg-primary/5 p-4 sm:p-5"
      data-testid="brief-result-summary"
    >
      <span className="mb-2 inline-flex items-center rounded border border-primary/50 bg-primary/10 px-1.5 py-0.5 tkad-type-note font-semibold text-primary">
        {isKo ? "한눈에 요약" : "At a glance"}
      </span>

      <p className={plannerNeon.summaryLead}>
        {sentence}
      </p>
      <p className="mt-2 tkad-type-meta">
        {isKo
          ? "* 노출·도달은 추정치입니다. 아래 실시간 지표에서 자세한 근거를 볼 수 있습니다."
          : "* Impressions and reach are estimates. See the detailed metrics below for basis."}
      </p>

      <div
        className={`mt-4 grid gap-4 ${hasDonut ? "sm:grid-cols-[1fr_auto]" : ""}`}
      >
        {hasDonut ? (
          <div>
            <p className="mb-2 tkad-type-title text-muted-foreground">
              {isKo ? "예산 배분 (매체 유형별)" : "Budget by media type"}
            </p>
            <BudgetSplitDonut data={budgetSplit!} />
          </div>
        ) : null}

        <div className="flex flex-col justify-center gap-2 border-t border-border pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
          <div className="flex items-center justify-between gap-3 tkad-type-body">
            <span className="text-muted-foreground">
              {isKo ? "선택 매체" : "Media selected"}
            </span>
            <span className="font-semibold tabular-nums">
              {mediaCount}
              {isKo ? "개" : ""}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 tkad-type-body">
            <span className="text-muted-foreground">
              {isKo ? "집행 기간" : "Flight"}
            </span>
            <span className="font-semibold tabular-nums">
              {days}
              {isKo ? "일" : "d"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 tkad-type-body">
            <span className="text-muted-foreground">
              {isKo ? "핵심 타깃" : "Target"}
            </span>
            <span className="text-right font-semibold">{targetLine}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

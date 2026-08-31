"use client";

/**
 * PR-6b / Phase 4a-4 실시간 지표 패널.
 *
 * 계산 가능 7개: 예산·노출·CPM + 순 도달·도달률·빈도·GRP
 * Reach 는 coverage 있는 매체만 포함; 제외 건수는 안내 문구로 표시.
 */

import type { MixMetrics } from "@/lib/planner/brief/mix-metrics";
import { DataQualityBadge } from "@/components/planner/brief/data-quality-badge";
import type { MetricBasis } from "@/lib/metrics/defaults";
import { overBudgetBannerLine } from "@/lib/planner/brief/over-budget-copy";
import {
  footfallVsReachFootnote,
  PLANNER_TOTAL_REACH_LABEL,
} from "@/lib/planner-report-performance-guide";
import {
  DATA_QUALITY_PENDING_HINT,
  dataQualityExcludedNote,
} from "@/lib/planner/brief/data-quality-copy";

function Row({
  label,
  value,
  basis,
  isKo,
}: {
  label: string;
  value: string;
  basis: MetricBasis | null;
  isKo: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1.5">
        <span className="text-sm font-semibold tabular-nums">{value}</span>
        <DataQualityBadge basis={basis} isKo={isKo} />
      </span>
    </div>
  );
}

function PendingRow({
  label,
  hint,
  isKo,
}: {
  label: string;
  hint: string;
  isKo: boolean;
}) {
  return (
    <div className="py-2 opacity-60">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="flex items-center gap-1.5">
          <span className="text-sm font-semibold tabular-nums text-muted-foreground">
            —
          </span>
          <DataQualityBadge basis={null} isKo={isKo} />
        </span>
      </div>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}

/** 큰 수를 만/백만 단위로 압축 표시 — 결과 요약 카드도 같은 표기를 쓴다 */
export function formatReach(n: number, isKo: boolean): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return isKo ? `${m.toFixed(1)}백만` : `${m.toFixed(1)}M`;
  }
  if (n >= 10_000) {
    const k = n / 10_000;
    return isKo ? `${k.toFixed(1)}만` : `${Math.round(n / 1000)}K`;
  }
  return n.toLocaleString(isKo ? "ko-KR" : "en-US");
}

export function MetricsPanel({
  metrics,
  isKo,
  customLineCount = 0,
}: {
  metrics: MixMetrics;
  isKo: boolean;
  /** 커스텀 라인 — CPM·노출 집계 제외 안내 */
  customLineCount?: number;
}) {
  const won = (n: number) =>
    isKo
      ? `₩${n.toLocaleString("ko-KR")}`
      : `₩${n.toLocaleString("en-US")}`;

  const pendingHint = isKo
    ? DATA_QUALITY_PENDING_HINT.ko
    : DATA_QUALITY_PENDING_HINT.en;

  const usedPct = Math.round(metrics.budgetUsedRate * 100);
  const reachReady = metrics.netReach != null;
  const excluded = metrics.reachMeta?.excludedCount ?? 0;

  return (
    <aside className="rounded-xl border border-border bg-card p-4">
      {/*
        면책 문구는 내보내기(PDF/PPTX)와 같은 말을 해야 한다.
        `lib/planner-report-export/payload-ooh.ts` 의 disclaimer 와 표현을 맞춘다 —
        화면은 "쓰지 말라" 하고 PDF 는 "써도 된다" 하던 불일치를 없앤 것이다.
        문구를 고칠 때는 양쪽을 함께 고칠 것.
      */}
      <p className="mb-3 rounded-lg border border-border bg-muted/50 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
        {isKo
          ? "노출·도달은 THINKAD 내부 추정 모델 기반이며, 실제 집행 시 매체 재고·계약 조건에 따라 달라질 수 있습니다."
          : "Impressions and reach use THINKAD internal estimates; actual delivery may vary by inventory and terms."}
      </p>

      <h3 className="mb-1 text-sm font-semibold">
        {isKo ? "실시간 지표" : "Live metrics"}
      </h3>

      <div className="divide-y divide-border">
        <Row
          label={isKo ? "예산 소진" : "Budget used"}
          value={
            metrics.budgetWon > 0
              ? `${won(metrics.totalCostWon.value)} · ${usedPct}%`
              : won(metrics.totalCostWon.value)
          }
          basis={metrics.totalCostWon.basis}
          isKo={isKo}
        />
        <Row
          label={isKo ? PLANNER_TOTAL_REACH_LABEL.ko : PLANNER_TOTAL_REACH_LABEL.en}
          value={metrics.totalImpressions.value.toLocaleString()}
          basis={metrics.totalImpressions.basis}
          isKo={isKo}
        />
        <p className="px-0 py-1 text-[10px] leading-relaxed text-muted-foreground">
          {footfallVsReachFootnote(isKo)}
        </p>
        <Row
          label={isKo ? "혼합 CPM" : "Mix CPM"}
          value={
            metrics.mixCpmWon.value == null
              ? isKo
                ? "산정 불가"
                : "N/A"
              : won(metrics.mixCpmWon.value)
          }
          basis={metrics.mixCpmWon.value == null ? null : metrics.mixCpmWon.basis}
          isKo={isKo}
        />
        {customLineCount > 0 ? (
          <p className="pb-2 text-[10px] leading-relaxed text-muted-foreground">
            {isKo
              ? `커스텀 ${customLineCount}건은 노출·CPM·도달 집계에서 제외됩니다.`
              : `${customLineCount} custom line(s) excluded from impressions, CPM, and reach.`}
          </p>
        ) : null}
      </div>

      {metrics.isOverBudget ? (
        <p className="mt-2 rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-[11px] font-medium text-destructive">
          {overBudgetBannerLine(metrics.overBudgetWon, isKo)}
        </p>
      ) : null}

      <div className="mt-4 border-t border-dashed border-border pt-3">
        <p className="mb-1 text-[11px] font-semibold text-muted-foreground">
          {isKo ? "도달 추정 (MOIS 인구 + ρ=0.7)" : "Reach estimate (MOIS pop + ρ=0.7)"}
        </p>
        <div className="divide-y divide-border">
          {reachReady ? (
            <>
              <Row
                label={isKo ? "순 도달" : "Net reach"}
                value={formatReach(metrics.netReach!.value, isKo)}
                basis={metrics.netReach!.basis}
                isKo={isKo}
              />
              <Row
                label={isKo ? "도달률" : "Reach rate"}
                value={`${(metrics.reachRate!.value * 100).toFixed(1)}%`}
                basis={metrics.reachRate!.basis}
                isKo={isKo}
              />
              <Row
                label={isKo ? "평균 빈도" : "Avg. frequency"}
                value={String(metrics.frequency!.value)}
                basis={metrics.frequency!.basis}
                isKo={isKo}
              />
              <Row
                label="GRP"
                value={String(metrics.grp!.value)}
                basis={metrics.grp!.basis}
                isKo={isKo}
              />
            </>
          ) : (
            <>
              <PendingRow
                label={isKo ? "순 도달" : "Net reach"}
                hint={pendingHint}
                isKo={isKo}
              />
              <PendingRow
                label={isKo ? "도달률" : "Reach rate"}
                hint={pendingHint}
                isKo={isKo}
              />
              <PendingRow
                label={isKo ? "평균 빈도" : "Avg. frequency"}
                hint={pendingHint}
                isKo={isKo}
              />
              <PendingRow label="GRP" hint={pendingHint} isKo={isKo} />
            </>
          )}
        </div>

        {excluded > 0 ? (
          <p className="mt-2 rounded-lg border border-border bg-muted/50 p-2 text-[11px] text-muted-foreground">
            {dataQualityExcludedNote(excluded, isKo)}
          </p>
        ) : null}
      </div>
    </aside>
  );
}

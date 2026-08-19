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

function formatReach(n: number, isKo: boolean): string {
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
}: {
  metrics: MixMetrics;
  isKo: boolean;
}) {
  const won = (n: number) =>
    isKo
      ? `₩${n.toLocaleString("ko-KR")}`
      : `₩${n.toLocaleString("en-US")}`;

  const pendingHint = isKo
    ? "커버리지·인구 데이터가 있는 매체가 없습니다"
    : "No media with coverage population data in this mix";

  const usedPct = Math.round(metrics.budgetUsedRate * 100);
  const reachReady = metrics.netReach != null;
  const excluded = metrics.reachMeta?.excludedCount ?? 0;

  return (
    <aside className="rounded-xl border border-border bg-card p-4">
      <p className="mb-3 rounded-lg border border-amber-400/40 bg-amber-400/10 p-2.5 text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
        {isKo
          ? "노출·도달은 추정치입니다. 데이터 정합성 작업 진행 중 — 대외 제안서에 사용 금지."
          : "Impressions and reach are estimates. Data integrity work in progress — do not use in client-facing proposals."}
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
          label={isKo ? "총 노출" : "Total impressions"}
          value={metrics.totalImpressions.value.toLocaleString()}
          basis={metrics.totalImpressions.basis}
          isKo={isKo}
        />
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
      </div>

      {metrics.isOverBudget ? (
        <p className="mt-2 rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-[11px] font-medium text-destructive">
          {isKo
            ? `예산 초과 ${won(metrics.overBudgetWon)} — 수량을 줄이거나 예산을 조정해 주세요.`
            : `Over budget by ${won(metrics.overBudgetWon)}.`}
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
            {isKo
              ? `${excluded}개 매체는 인구·커버리지 데이터 미비로 도달 계산에서 제외되었습니다.`
              : `${excluded} media excluded from reach — missing coverage population data.`}
          </p>
        ) : null}
      </div>
    </aside>
  );
}

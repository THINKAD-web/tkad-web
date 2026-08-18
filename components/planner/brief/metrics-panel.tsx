"use client";

/**
 * PR-6b 실시간 지표 패널.
 *
 * 계산 가능 3개(예산 소진·총 노출·혼합 CPM)는 값과 신뢰도 배지를 함께,
 * 산정 불가 4개(순 도달·도달률·평균 빈도·GRP)는 **자리를 비우지 않고**
 * 회색 + [산정 중] + "무엇이 오는지" 한 줄로 보여준다. 빈 화면은 고장으로
 * 보인다.
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
    ? "행정동 인구 데이터 연동 후 제공"
    : "Available after dong population data is connected";

  const usedPct = Math.round(metrics.budgetUsedRate * 100);

  return (
    <aside className="rounded-xl border border-border bg-card p-4">
      {/* 고정 안내 — 대외 사용 금지 */}
      <p className="mb-3 rounded-lg border border-amber-400/40 bg-amber-400/10 p-2.5 text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
        {isKo
          ? "노출·도달은 추정치입니다. 데이터 정합성 작업 진행 중 — 대외 제안서에 사용 금지."
          : "Impressions and reach are estimates. Data integrity work in progress — do not use in client-facing proposals."}
      </p>

      <h3 className="mb-1 text-sm font-semibold">
        {isKo ? "실시간 지표" : "Live metrics"}
      </h3>

      {/* ── 계산 가능 ── */}
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

      {/* 예산 초과 — 막지 않고 명확히 표시 */}
      {metrics.isOverBudget ? (
        <p className="mt-2 rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-[11px] font-medium text-destructive">
          {isKo
            ? `예산 초과 ${won(metrics.overBudgetWon)} — 수량을 줄이거나 예산을 조정해 주세요.`
            : `Over budget by ${won(metrics.overBudgetWon)}.`}
        </p>
      ) : null}

      {/* ── 산정 불가 ── */}
      <div className="mt-4 border-t border-dashed border-border pt-3">
        <p className="mb-1 text-[11px] font-semibold text-muted-foreground">
          {isKo ? "인구 데이터 연동 후 제공" : "Pending population data"}
        </p>
        <div className="divide-y divide-border">
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
        </div>
      </div>
    </aside>
  );
}

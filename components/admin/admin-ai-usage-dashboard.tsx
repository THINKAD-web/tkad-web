"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { BRAND_ACCENT } from "@/lib/brand-palette";

type FeatureRow = {
  feature: string;
  featureLabel: string;
  models: string[];
  calls: number;
  tokens: number;
  estCostUsd: number;
  estCostKrw: number;
};
type ModelRow = {
  model: string;
  modelLabel: string;
  calls: number;
  tokens: number;
  estCostUsd: number;
  estCostKrw: number;
};
type DailyPoint = { date: string; tokens: number; costUsd: number };
type Summary = { tokens: number; estCostUsd: number; estCostKrw: number };
type Resp = {
  configured: boolean;
  usdKrw: number;
  totals: (Summary & { calls: number }) | null;
  today: Summary | null;
  month: Summary | null;
  byFeature: FeatureRow[];
  byModel: ModelRow[];
  daily: DailyPoint[];
};

const usd = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const krw = (n: number) => `₩${Math.round(n).toLocaleString("ko-KR")}`;
const num = (n: number) => n.toLocaleString("ko-KR");

const MODEL_COLORS: Record<string, string> = {
  Haiku: "#22c55e",
  Sonnet: BRAND_ACCENT,
  Opus: "#ef4444",
};
function modelColor(label: string): string {
  return MODEL_COLORS[label] ?? "#64748b";
}

function Card({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={
        "rounded-xl border p-4 " +
        (accent
          ? "border-[color:var(--qp-accent)]/40 bg-[color:var(--qp-accent-soft)] dark:border-[color:var(--qp-accent)]/30 dark:bg-[color:var(--qp-accent)]/10"
          : "border-gray-200 bg-white dark:border-white/10 dark:bg-white/5")
      }
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-black tabular-nums text-[color:var(--qp-accent)] dark:text-[color:var(--qp-accent)]">
        {value}
      </p>
      {sub ? <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

function FeatureCostBars({ rows }: { rows: FeatureRow[] }) {
  const max = Math.max(...rows.map((r) => r.estCostUsd), 0.0001);
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
      <p className="mb-3 text-sm font-bold">기능별 추정 비용</p>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">데이터 없음</p>
      ) : (
        <div className="space-y-2.5">
          {rows.map((r) => (
            <div key={r.feature}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                <span className="font-semibold">{r.featureLabel}</span>
                <span className="tabular-nums text-muted-foreground">
                  {usd(r.estCostUsd)} · {krw(r.estCostKrw)}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                <div
                  className="h-full rounded-full bg-[color:var(--qp-accent)]"
                  style={{ width: `${Math.max(2, (r.estCostUsd / max) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ModelDistribution({ rows }: { rows: ModelRow[] }) {
  const total = rows.reduce((s, r) => s + r.tokens, 0) || 1;
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
      <p className="mb-3 text-sm font-bold">모델별 분포 (토큰)</p>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">데이터 없음</p>
      ) : (
        <>
          <div className="flex h-3 overflow-hidden rounded-full">
            {rows.map((r) => (
              <div
                key={r.model}
                title={`${r.modelLabel} ${Math.round((r.tokens / total) * 100)}%`}
                style={{
                  width: `${(r.tokens / total) * 100}%`,
                  backgroundColor: modelColor(r.modelLabel),
                }}
              />
            ))}
          </div>
          <div className="mt-3 space-y-1.5">
            {rows.map((r) => (
              <div key={r.model} className="flex items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: modelColor(r.modelLabel) }}
                  />
                  <span className="font-semibold">{r.modelLabel}</span>
                  <span className="text-muted-foreground">
                    {Math.round((r.tokens / total) * 100)}%
                  </span>
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {num(r.tokens)} tok · {usd(r.estCostUsd)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function DailyCostChart({ daily }: { daily: DailyPoint[] }) {
  const pts = daily.slice(-30);
  const max = Math.max(...pts.map((p) => p.costUsd), 0.0001);
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
      <p className="mb-3 text-sm font-bold">일자별 추정 비용 (최근 30일)</p>
      <div className="flex h-28 items-end gap-[3px]">
        {pts.map((p) => (
          <div
            key={p.date}
            title={`${p.date} · $${p.costUsd.toFixed(4)} · ${num(p.tokens)} tok`}
            className="group flex-1 rounded-t bg-[color:var(--qp-accent)]/80 transition-colors hover:bg-[color:var(--qp-accent)]"
            style={{ height: `${Math.max(2, (p.costUsd / max) * 100)}%` }}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
        <span>{pts[0]?.date.slice(5)}</span>
        <span>{pts[pts.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}

type Period = "today" | "7d" | "30d" | "all";
const PERIODS: { key: Period; label: string }[] = [
  { key: "today", label: "오늘" },
  { key: "7d", label: "7일" },
  { key: "30d", label: "30일" },
  { key: "all", label: "전체" },
];

export function AdminAiUsageDashboard() {
  const [period, setPeriod] = useState<Period>("30d");
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/ai-usage?period=${period}`, {
        cache: "no-store",
      });
      setData((await res.json()) as Resp);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = data?.totals;

  return (
    <div className="space-y-5">
      {/* 오늘 / 이번달 KPI (기간 토글과 무관, 항상 표시) */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card
          label="오늘 추정 비용"
          value={usd(data?.today?.estCostUsd ?? 0)}
          sub={`${krw(data?.today?.estCostKrw ?? 0)} · ${num(data?.today?.tokens ?? 0)} tok`}
          accent
        />
        <Card
          label="이번달 추정 비용"
          value={usd(data?.month?.estCostUsd ?? 0)}
          sub={`${krw(data?.month?.estCostKrw ?? 0)} · ${num(data?.month?.tokens ?? 0)} tok`}
          accent
        />
        <Card
          label="이번달 토큰"
          value={num(data?.month?.tokens ?? 0)}
          sub="입력+출력 합산"
        />
        <Card
          label="환율"
          value={krw(data?.usdKrw ?? 0)}
          sub="USD 1 기준 (env)"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-xl border border-gray-200 p-0.5 dark:border-white/10">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              className={
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors " +
                (period === p.key
                  ? "bg-[color:var(--qp-accent)] text-white"
                  : "text-muted-foreground hover:bg-gray-50 dark:hover:bg-white/5")
              }
            >
              {p.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 px-3 text-xs font-semibold dark:border-white/10"
        >
          <RefreshCw className={"h-3.5 w-3.5 " + (loading ? "animate-spin" : "")} />
          새로고침
        </button>
        <span className="text-[11px] text-muted-foreground">선택 기간 합계 ↓</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card
          label="기간 추정 비용"
          value={usd(totals?.estCostUsd ?? 0)}
          sub={krw(totals?.estCostKrw ?? 0)}
        />
        <Card label="기간 토큰" value={num(totals?.tokens ?? 0)} />
        <Card label="기간 호출" value={num(totals?.calls ?? 0)} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <FeatureCostBars rows={data?.byFeature ?? []} />
        <ModelDistribution rows={data?.byModel ?? []} />
      </div>

      {data && data.daily && data.daily.length > 0 ? (
        <DailyCostChart daily={data.daily} />
      ) : null}

      {loading && !data ? (
        <div className="py-10 text-center text-muted-foreground">
          <Loader2 className="mx-auto h-5 w-5 animate-spin" />
        </div>
      ) : data && data.configured === false ? (
        <p className="py-10 text-center text-sm text-muted-foreground">DB 미설정</p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {/* 기능별 상세 */}
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10">
            <div className="border-b border-gray-100 px-4 py-3 text-sm font-bold dark:border-white/10">
              기능별 상세
            </div>
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs uppercase text-muted-foreground dark:border-white/10 dark:bg-white/5">
                  <th className="p-3">기능</th>
                  <th className="p-3 text-right">호출</th>
                  <th className="p-3 text-right">토큰</th>
                  <th className="p-3 text-right">비용(₩)</th>
                </tr>
              </thead>
              <tbody>
                {(data?.byFeature ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground">
                      데이터 없음
                    </td>
                  </tr>
                ) : (
                  data!.byFeature.map((f) => (
                    <tr key={f.feature} className="border-b dark:border-white/5">
                      <td className="p-3">
                        <p className="font-semibold">{f.featureLabel}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {f.models.join(", ")}
                        </p>
                      </td>
                      <td className="p-3 text-right tabular-nums">{num(f.calls)}</td>
                      <td className="p-3 text-right tabular-nums">{num(f.tokens)}</td>
                      <td className="p-3 text-right font-semibold tabular-nums text-[color:var(--qp-accent)] dark:text-[color:var(--qp-accent)]">
                        {krw(f.estCostKrw)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 모델별 상세 */}
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10">
            <div className="border-b border-gray-100 px-4 py-3 text-sm font-bold dark:border-white/10">
              모델별 상세
            </div>
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs uppercase text-muted-foreground dark:border-white/10 dark:bg-white/5">
                  <th className="p-3">모델</th>
                  <th className="p-3 text-right">호출</th>
                  <th className="p-3 text-right">토큰</th>
                  <th className="p-3 text-right">비용(₩)</th>
                </tr>
              </thead>
              <tbody>
                {(data?.byModel ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground">
                      데이터 없음
                    </td>
                  </tr>
                ) : (
                  data!.byModel.map((m) => (
                    <tr key={m.model} className="border-b dark:border-white/5">
                      <td className="p-3">
                        <p className="font-semibold">{m.modelLabel}</p>
                        <p className="text-[11px] text-muted-foreground">{m.model}</p>
                      </td>
                      <td className="p-3 text-right tabular-nums">{num(m.calls)}</td>
                      <td className="p-3 text-right tabular-nums">{num(m.tokens)}</td>
                      <td className="p-3 text-right font-semibold tabular-nums text-[color:var(--qp-accent)] dark:text-[color:var(--qp-accent)]">
                        {krw(m.estCostKrw)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        ※ 비용은 모델별 입력/출력 단가(환경변수 ANTHROPIC_*_PER_1M)로 계산한 추정치이며 실제
        청구액과 다를 수 있습니다. 신규 통합 로깅(AiUsageLog) 적용 이후 호출만 집계됩니다.
      </p>
    </div>
  );
}

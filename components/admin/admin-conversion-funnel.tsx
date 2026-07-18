"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, ArrowDown, AlertTriangle } from "lucide-react";

type Stage = {
  key: string;
  label: string;
  count: number;
  conversionPct: number | null;
  isBottleneck: boolean;
  source: string;
};
type Funnel = {
  periodDays: number;
  generatedAt: string;
  totalSessions: number;
  stages: Stage[];
  bottleneckKey: string | null;
};

const num = (n: number) => n.toLocaleString("ko-KR");

export function AdminConversionFunnel() {
  const [period, setPeriod] = useState<7 | 30>(30);
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/conversion-funnel?period=${period}`, {
        cache: "no-store",
      });
      const d = (await res.json()) as { funnel: Funnel | null };
      setFunnel(d.funnel);
    } catch {
      setFunnel(null);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void load();
  }, [load]);

  const maxCount = funnel ? Math.max(...funnel.stages.map((s) => s.count), 1) : 1;

  return (
    <section className="rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold tracking-tight">
            방문 전환 퍼널
          </h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            홈 방문 → 매체 조회 → 플랜 담기 → 견적 생성 → 문의/계약 · 세션 기준
          </p>
        </div>
        <div className="inline-flex rounded-xl border border-border/60 p-0.5">
          {([7, 30] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors " +
                (period === p
                  ? "bg-[color:var(--qp-accent)] text-white"
                  : "text-muted-foreground hover:bg-muted/40")
              }
            >
              {p}일
            </button>
          ))}
        </div>
      </div>

      {loading && !funnel ? (
        <div className="py-12 text-center">
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !funnel ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          데이터가 없습니다. (DB 미설정 또는 추적 데이터 없음)
        </p>
      ) : (
        <div className="space-y-1">
          {funnel.stages.map((s, i) => {
            const widthPct = Math.max(6, (s.count / maxCount) * 100);
            const bottleneck = s.isBottleneck;
            return (
              <div key={s.key}>
                {i > 0 ? (
                  <div className="flex items-center justify-center py-1">
                    <span
                      className={
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums " +
                        (bottleneck
                          ? "bg-red-500/15 text-red-500"
                          : "text-muted-foreground")
                      }
                    >
                      <ArrowDown className="h-3 w-3" />
                      {s.conversionPct != null ? `${s.conversionPct}%` : "—"}
                      {bottleneck ? (
                        <span className="ml-1 inline-flex items-center gap-0.5">
                          <AlertTriangle className="h-3 w-3" />
                          어려운 지점
                        </span>
                      ) : null}
                    </span>
                  </div>
                ) : null}
                <div className="mx-auto" style={{ width: `${widthPct}%`, minWidth: "160px" }}>
                  <div
                    className={
                      "rounded-xl border px-4 py-3 transition-colors " +
                      (bottleneck
                        ? "border-red-500/50 bg-red-500/10"
                        : "border-border/60 bg-background/50")
                    }
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className={
                          "text-sm font-bold " +
                          (bottleneck ? "text-red-600 dark:text-red-400" : "")
                        }
                      >
                        {s.label}
                      </span>
                      <span className="text-lg font-black tabular-nums">
                        {num(s.count)}
                        <span className="ml-0.5 text-xs font-medium text-muted-foreground">
                          명
                        </span>
                      </span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{s.source}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {funnel?.bottleneckKey ? (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-600 dark:text-red-400">
          <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />
          전환율이 가장 낮은 단계는{" "}
          <b>{funnel.stages.find((s) => s.key === funnel.bottleneckKey)?.label}</b> 입니다 —
          이 구간 개선이 전체 전환에 가장 큰 영향을 줍니다.
        </p>
      ) : null}

      <p className="mt-2 text-[10px] text-muted-foreground">
        ※ 세션(익명 sessionId) 단위 distinct 집계. ‘플랜 담기’는 /planner 진입 기준,
        견적·문의는 전환 이벤트(quote_request·contract) 우선.
      </p>
    </section>
  );
}

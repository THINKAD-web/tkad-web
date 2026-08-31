"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type Counts = { found: number; lost: number; complex: number };
type SurfaceRow = { surface: string; counts: Counts; total: number };
type Resp = {
  configured: boolean;
  period: number;
  surfaces: SurfaceRow[];
  totals: { counts: Counts; total: number } | null;
};

const ANSWER_META: { key: keyof Counts; label: string; emoji: string; color: string }[] = [
  { key: "found", label: "찾았어요", emoji: "👍", color: "#22c55e" },
  { key: "lost", label: "뭘 할지 모름", emoji: "🤔", color: "#f59e0b" },
  { key: "complex", label: "너무 복잡", emoji: "😵", color: "#ef4444" },
];

const SURFACE_LABEL: Record<string, string> = {
  media_detail: "매체 상세",
  planner: "플래너",
};

const num = (n: number) => n.toLocaleString("ko-KR");

function Bar({ counts, total }: { counts: Counts; total: number }) {
  const t = total || 1;
  return (
    <>
      <div className="flex h-3 overflow-hidden rounded-full">
        {ANSWER_META.map((a) => (
          <div
            key={a.key}
            title={`${a.label} ${Math.round(((counts[a.key] ?? 0) / t) * 100)}%`}
            style={{ width: `${((counts[a.key] ?? 0) / t) * 100}%`, backgroundColor: a.color }}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {ANSWER_META.map((a) => {
          const c = counts[a.key] ?? 0;
          return (
            <span key={a.key} className="flex items-center gap-1.5 text-xs">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: a.color }} />
              <span className="font-semibold">
                {a.emoji} {a.label}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {num(c)} ({Math.round((c / t) * 100)}%)
              </span>
            </span>
          );
        })}
      </div>
    </>
  );
}

export function AdminExitSurveyCard() {
  const [period, setPeriod] = useState<7 | 30>(30);
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/exit-survey?period=${period}`, { cache: "no-store" });
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

  return (
    <section className="rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold tracking-tight">이탈 설문 — “어렵다”의 정체</h2>
          <p className="mt-0.5 tkad-type-caption text-muted-foreground">
            매체 상세·플래너 이탈 시점 1클릭 응답 · 길을 못 찾는지 / 정보 부족인지 / 복잡한지 구분
          </p>
        </div>
        <div className="inline-flex rounded-xl border border-border/60 p-0.5">
          {([7, 30] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={
                "rounded-lg px-3 py-1.5 tkad-type-title transition-colors " +
                (period === p ? "bg-[color:var(--qp-accent)] text-white" : "text-muted-foreground hover:bg-muted/40")
              }
            >
              {p}일
            </button>
          ))}
        </div>
      </div>

      {loading && !data ? (
        <div className="py-10 text-center">
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !data || data.configured === false ? (
        <p className="py-8 text-center text-sm text-muted-foreground">DB 미설정</p>
      ) : (data.totals?.total ?? 0) === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          아직 수집된 응답이 없습니다.
        </p>
      ) : (
        <div className="space-y-5">
          {data.totals ? (
            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="text-sm font-bold">전체</span>
                <span className="text-xs text-muted-foreground">{num(data.totals.total)}건</span>
              </div>
              <Bar counts={data.totals.counts} total={data.totals.total} />
            </div>
          ) : null}
          {data.surfaces.map((s) => (
            <div key={s.surface}>
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="tkad-type-title">
                  {SURFACE_LABEL[s.surface] ?? s.surface}
                </span>
                <span className="text-xs text-muted-foreground">{num(s.total)}건</span>
              </div>
              <Bar counts={s.counts} total={s.total} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

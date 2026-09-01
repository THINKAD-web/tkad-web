"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, CheckCircle2, AlertTriangle, RefreshCw, Loader2 } from "lucide-react";

type Row = {
  name: string;
  kind: string;
  url: string;
  status: number;
  ok: boolean;
  ms: number;
  issue?: string;
};
type HealthResult = {
  ranAt: string;
  base: string;
  total: number;
  pass: number;
  fail: number;
  rows: Row[];
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금 전";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export function AdminSystemStatusCard() {
  const [result, setResult] = useState<HealthResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/health/status", { cache: "no-store" });
      const d = (await res.json()) as { result: HealthResult | null };
      setResult(d.result);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runNow = async () => {
    setRunning(true);
    try {
      const res = await fetch("/api/admin/health/status", {
        method: "POST",
        cache: "no-store",
      });
      const d = (await res.json()) as { result: HealthResult | null };
      if (d.result) setResult(d.result);
    } finally {
      setRunning(false);
    }
  };

  const fail = result?.fail ?? 0;
  const healthy = result != null && fail === 0;
  const failedRows = (result?.rows ?? []).filter((r) => !r.ok);

  return (
    <section
      className={
        "rounded-2xl border p-4 backdrop-blur " +
        (result == null
          ? "border-border/60 bg-card/40"
          : healthy
            ? "border-emerald-500/30 bg-emerald-500/5"
            : "border-red-500/40 bg-red-500/10")
      }
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 tkad-type-label text-muted-foreground">
          <Activity className="h-4 w-4 text-[color:var(--qp-accent)]/80" aria-hidden />
          [ 시스템 상태 ]
        </h2>
        <button
          type="button"
          onClick={() => void runNow()}
          disabled={running}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border/60 px-2.5 tkad-type-caption font-semibold transition hover:bg-muted/40 disabled:opacity-60"
        >
          <RefreshCw className={"h-3.5 w-3.5 " + (running ? "animate-spin" : "")} />
          지금 점검
        </button>
      </div>

      {loading && !result ? (
        <div className="py-6 text-center">
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : result == null ? (
        <p className="py-5 text-center text-sm text-muted-foreground">
          아직 점검 기록이 없습니다. “지금 점검”을 눌러 실행하세요.
        </p>
      ) : (
        <div className="mt-3">
          <div className="flex items-center gap-3">
            {healthy ? (
              <CheckCircle2 className="h-9 w-9 text-emerald-500" />
            ) : (
              <AlertTriangle className="h-9 w-9 text-red-500" />
            )}
            <div>
              <p className="text-lg font-black">
                {healthy ? (
                  <span className="text-emerald-600 dark:text-emerald-400">정상</span>
                ) : (
                  <span className="text-red-600 dark:text-red-400">오류 {fail}건</span>
                )}
                <span className="ml-2 text-sm font-medium text-muted-foreground">
                  {result.pass}/{result.total} 통과
                </span>
              </p>
              <p className="tkad-type-caption text-muted-foreground">
                {timeAgo(result.ranAt)} · {result.base.replace(/^https?:\/\//, "")}
              </p>
            </div>
          </div>

          {failedRows.length > 0 ? (
            <ul className="mt-3 space-y-1.5">
              {failedRows.slice(0, 8).map((r) => (
                <li
                  key={`${r.kind}-${r.url}`}
                  className="flex items-start justify-between gap-2 rounded-lg border border-red-400/30 bg-red-950/10 px-3 py-1.5 text-xs"
                >
                  <span className="min-w-0 truncate font-mono tkad-type-caption">{r.url}</span>
                  <span className="shrink-0 font-semibold text-red-500">
                    {r.issue ?? `HTTP ${r.status}`}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </section>
  );
}

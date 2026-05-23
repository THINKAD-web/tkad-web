"use client";

import type { ComponentType } from "react";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Database,
  Loader2,
  RefreshCw,
  Users,
  MessageSquare,
  Gauge,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LaunchMonitorSnapshot } from "@/lib/monitoring/launch-metrics";
import type { SystemHealthSnapshot } from "@/lib/monitoring/system-health";

type ApiPayload = {
  metrics: LaunchMonitorSnapshot;
  system: SystemHealthSnapshot;
};

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  alert,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: ComponentType<{ className?: string }>;
  alert?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border-2 border-border bg-card p-4",
        alert && "border-rose-400/60",
      )}
    >
      <div className="flex items-center gap-2 text-xs font-display uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
      {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

export function AdminLaunchMonitorClient({ locale }: { locale: string }) {
  const [data, setData] = useState<ApiPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/launch-monitor?hours=1", {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`${res.status}`);
      setData((await res.json()) as ApiPayload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load_failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 60_000);
    return () => clearInterval(id);
  }, [load]);

  const m = data?.metrics;
  const prefix = `/${locale}`;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-lg font-black uppercase tracking-widest text-foreground">
            Launch Monitor
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            오픈 1주일 실시간 지표 · 매시간 Slack 자동 리포트
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full border-2 border-border px-4 py-2 text-xs font-bold uppercase"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          새로고침
        </button>
      </div>

      {error ? (
        <p className="text-sm text-rose-500">로드 실패: {error}</p>
      ) : null}

      {m ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="지난 1시간 방문(세션)"
              value={String(m.visitors.lastHourSessions)}
              sub={`활성(5분) ${m.visitors.activeNow}`}
              icon={Activity}
            />
            <StatCard
              label="지난 1시간 가입"
              value={String(m.signups.lastHour)}
              sub={`오늘 ${m.signups.today}`}
              icon={Users}
            />
            <StatCard
              label="지난 1시간 문의"
              value={String(m.inquiries.lastHour)}
              sub={`오늘 ${m.inquiries.today}`}
              icon={MessageSquare}
            />
            <StatCard
              label="지난 1시간 에러"
              value={String(m.errors.lastHour)}
              sub={`5xx ${m.errors.criticalLastHour}`}
              icon={AlertTriangle}
              alert={m.errors.criticalLastHour > 0}
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <StatCard
              label="LCP p75 (1h)"
              value={
                m.response.webVitalsP75Ms != null
                  ? `${(m.response.webVitalsP75Ms / 1000).toFixed(1)}s`
                  : "—"
              }
              sub={`샘플 ${m.response.sampleCount}`}
              icon={Gauge}
            />
            <StatCard
              label="DB"
              value={m.database.ok ? "연결됨" : "오류"}
              sub={m.database.detail}
              icon={Database}
              alert={!m.database.ok}
            />
          </div>

          <div className="rounded-xl border-2 border-border bg-muted/30 p-4 text-sm">
            <p className="font-semibold">백업</p>
            <p className="mt-1 text-muted-foreground">{m.backup.pitrNote}</p>
            <p className="mt-2 text-xs">
              최근 스냅샷: {m.backup.lastStatus ?? "—"}{" "}
              {m.backup.lastRunAt
                ? new Date(m.backup.lastRunAt).toLocaleString("ko-KR")
                : ""}
            </p>
            <p className="mt-2 text-xs">
              GA4 env: {m.ga4.envId ? "NEXT_PUBLIC_GA_ID ✓" : "—"} · DB:{" "}
              {m.ga4.dbConfigured ? "설정됨" : "—"} · Sentry:{" "}
              {m.sentry.configured ? "DSN ✓" : "미설정"}
            </p>
          </div>

          {data?.system.recentErrors.length ? (
            <div className="rounded-xl border-2 border-border bg-card p-4">
              <h2 className="text-sm font-bold">최근 에러</h2>
              <ul className="mt-3 space-y-2 text-xs">
                {data.system.recentErrors.map((e) => (
                  <li key={e.id} className="border-b border-border/50 pb-2">
                    <span className="text-rose-500">{e.status}</span>{" "}
                    {e.path ?? "—"} — {(e.message ?? "").slice(0, 120)}
                  </li>
                ))}
              </ul>
              <Link
                href={`${prefix}/admin/monitoring`}
                className="mt-3 inline-block text-xs text-accent underline"
              >
                운영 모니터링 상세 →
              </Link>
            </div>
          ) : null}
        </>
      ) : loading ? (
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
      ) : null}
    </div>
  );
}

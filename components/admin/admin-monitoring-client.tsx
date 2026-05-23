"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Database,
  Loader2,
  RefreshCw,
  Server,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MonitoringDashboardData } from "@/lib/monitoring/dashboard-data";
import type { MonitoringPeriod } from "@/lib/monitoring/period";

type Props = {
  locale: string;
};

const PERIODS: { key: MonitoringPeriod; label: string }[] = [
  { key: "today", label: "오늘" },
  { key: "week", label: "이번 주" },
  { key: "month", label: "이번 달" },
];

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full",
        ok ? "bg-emerald-400" : "bg-rose-400",
      )}
      aria-hidden
    />
  );
}

function FunnelBar({
  label,
  count,
  rate,
  max,
}: {
  label: string;
  count: number;
  rate?: string;
  max: number;
}) {
  const width = max > 0 ? Math.max(4, Math.round((count / max) * 100)) : 0;
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">
          {count.toLocaleString()}
          {rate ? ` · ${rate}` : ""}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

export function AdminMonitoringClient({ locale }: Props) {
  const [period, setPeriod] = useState<MonitoringPeriod>("week");
  const [data, setData] = useState<MonitoringDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/monitoring?period=${period}`, {
        cache: "no-store",
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error ?? "load_failed");
      }
      setData(body as MonitoringDashboardData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load_failed");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 30_000);
    return () => clearInterval(t);
  }, [load]);

  const funnelMax = data
    ? Math.max(
        data.funnel.visit,
        data.funnel.mediaView,
        data.funnel.favorite,
        data.funnel.quoteRequest,
        data.funnel.contract,
        1,
      )
    : 1;

  return (
    <div className="space-y-8 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-cyan-500/80">
            [ Ops Monitoring ]
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            실시간 운영 모니터링
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            30초마다 자동 갱신 · DB PageView / ConversionEvent 기준
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-border bg-card p-0.5">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPeriod(p.key)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                  period === p.key
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card hover:bg-muted"
            aria-label="새로고침"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      {loading && !data ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : null}

      {data ? (
        <>
          {/* 1. Visitors */}
          <section className="rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur">
            <h2 className="flex items-center gap-2 font-display text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              <Users className="h-4 w-4 text-cyan-400/80" />
              [ 방문자 현황 ]
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard
                label="현재 접속"
                value={data.visitors.activeNow}
                highlight
              />
              <StatCard label="오늘" value={data.visitors.today} />
              <StatCard label="이번 주" value={data.visitors.week} />
              <StatCard label="이번 달" value={data.visitors.month} />
            </div>
            <div className="mt-6">
              <p className="font-display text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                페이지별 조회 Top 10
              </p>
              <ol className="mt-2 space-y-1">
                {data.visitors.topPages.length === 0 ? (
                  <li className="text-sm text-muted-foreground">데이터 없음</li>
                ) : (
                  data.visitors.topPages.map((p, i) => (
                    <li
                      key={p.path}
                      className="flex justify-between gap-2 text-xs"
                    >
                      <span className="truncate text-foreground/90">
                        {i + 1}. {p.path}
                      </span>
                      <span className="shrink-0 text-muted-foreground">
                        {p.views}
                      </span>
                    </li>
                  ))
                )}
              </ol>
            </div>
          </section>

          {/* 2. Funnel */}
          <section className="rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur">
            <h2 className="flex items-center gap-2 font-display text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              <Activity className="h-4 w-4 text-violet-400/80" />
              [ 전환 퍼널 ]
            </h2>
            <div className="mt-4 space-y-4">
              <FunnelBar
                label="방문"
                count={data.funnel.visit}
                max={funnelMax}
              />
              <FunnelBar
                label="매체 조회"
                count={data.funnel.mediaView}
                rate={`${data.funnel.rates.visitToMediaView}%`}
                max={funnelMax}
              />
              <FunnelBar
                label="찜하기"
                count={data.funnel.favorite}
                rate={`${data.funnel.rates.mediaViewToFavorite}%`}
                max={funnelMax}
              />
              <FunnelBar
                label="견적 요청"
                count={data.funnel.quoteRequest}
                rate={`${data.funnel.rates.favoriteToQuote}%`}
                max={funnelMax}
              />
              <FunnelBar
                label="계약"
                count={data.funnel.contract}
                rate={`${data.funnel.rates.quoteToContract}%`}
                max={funnelMax}
              />
            </div>
          </section>

          {/* 3. Media rankings */}
          <section className="grid gap-4 lg:grid-cols-3">
            <RankingCard title="조회수 Top 10" rows={data.mediaRankings.views} />
            <RankingCard
              title="찜 수 Top 10"
              rows={data.mediaRankings.favorites}
            />
            <RankingCard
              title="문의 전환율 Top 10"
              rows={data.mediaRankings.conversion.map((r) => ({
                mediaId: r.mediaId,
                name: r.name,
                count: r.rate,
                suffix: "%",
              }))}
            />
          </section>

          {/* 4. Alerts */}
          <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
            <h2 className="flex items-center gap-2 font-display text-xs font-medium uppercase tracking-[0.2em] text-amber-200/90">
              <AlertTriangle className="h-4 w-4" />
              [ 알림 센터 ]
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <AlertBlock
                title={`미처리 문의 (24h+)`}
                count={data.alerts.staleInquiries.length}
                href={`/${locale}/admin/inquiries`}
                items={data.alerts.staleInquiries.map((i) => ({
                  id: i.id,
                  primary: i.company,
                  secondary: i.name,
                }))}
              />
              <AlertBlock
                title="만료 예정 견적 (D-3)"
                count={data.alerts.expiringQuotes.length}
                href={`/${locale}/admin/quotes`}
                items={data.alerts.expiringQuotes.map((q) => ({
                  id: q.id,
                  primary: q.company,
                  secondary: q.validUntil
                    ? new Date(q.validUntil).toLocaleDateString("ko-KR")
                    : "-",
                }))}
              />
              <AlertBlock
                title="캠페인 시작 (D-1)"
                count={data.alerts.campaignsStartingSoon.length}
                href={`/${locale}/admin/campaigns`}
                items={data.alerts.campaignsStartingSoon.map((c) => ({
                  id: c.id,
                  primary: c.name,
                  secondary: c.startDate
                    ? new Date(c.startDate).toLocaleDateString("ko-KR")
                    : "-",
                }))}
              />
              <AlertBlock
                title="매체 등록 신청 대기"
                count={data.alerts.pendingMediaApplications}
                href={`/${locale}/admin/applications`}
                items={[]}
                countOnly
              />
            </div>
          </section>

          {/* 5. System */}
          <section className="rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur">
            <h2 className="flex items-center gap-2 font-display text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              <Server className="h-4 w-4" />
              [ 시스템 상태 ]
            </h2>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <ServiceRow label="Database" status={data.system.database} />
              <ServiceRow label="Cloudinary" status={data.system.cloudinary} />
              <ServiceRow label="Kakao Map" status={data.system.kakaoMap} />
              <ServiceRow label="Resend" status={data.system.resend} />
            </ul>
            <div className="mt-4 rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-xs">
              <p className="text-muted-foreground">Vercel</p>
              <p className="mt-1 text-foreground">
                env: {data.system.vercel.env ?? "—"} · commit:{" "}
                {data.system.vercel.commit ?? "—"}
              </p>
              {data.system.vercel.deploymentUrl ? (
                <a
                  href={data.system.vercel.deploymentUrl}
                  className="mt-1 inline-block text-cyan-400 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {data.system.vercel.deploymentUrl}
                </a>
              ) : null}
            </div>
            <div className="mt-4">
              <p className="font-display text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                최근 에러 로그
              </p>
              {data.system.recentErrors.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">최근 500 없음</p>
              ) : (
                <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto">
                  {data.system.recentErrors.map((e) => (
                    <li
                      key={e.id}
                      className="rounded-lg border border-border/50 bg-card/50 px-3 py-2 text-[11px]"
                    >
                      <span className="text-rose-400">{e.status}</span>{" "}
                      {e.tag ?? "api"} · {e.path ?? "—"}
                      <p className="mt-0.5 line-clamp-2 text-muted-foreground">
                        {e.message}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {!data.configured ? (
            <p className="text-center text-xs text-amber-400/90">
              DATABASE_URL 미설정 — 트래킹·집계가 비활성입니다. prisma db push 후
              배포하세요.
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3",
        highlight
          ? "border-cyan-500/40 bg-cyan-500/10"
          : "border-border/60 bg-card/60",
      )}
    >
      <p className="font-display text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value.toLocaleString()}</p>
    </div>
  );
}

function RankingCard({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ mediaId: string; name: string; count: number; suffix?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-4 backdrop-blur">
      <p className="font-display text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
        {title}
      </p>
      <ol className="mt-3 space-y-2">
        {rows.length === 0 ? (
          <li className="text-sm text-muted-foreground">—</li>
        ) : (
          rows.map((r, i) => (
            <li key={r.mediaId} className="flex items-center justify-between gap-2 text-sm">
              <Link
                href={`/media/${r.mediaId}`}
                className="min-w-0 truncate hover:text-cyan-400"
              >
                {i + 1}. {r.name}
              </Link>
              <span className="shrink-0 text-xs text-muted-foreground">
                {r.count}
                {r.suffix ?? ""}
              </span>
            </li>
          ))
        )}
      </ol>
    </div>
  );
}

function AlertBlock({
  title,
  count,
  href,
  items,
  countOnly,
}: {
  title: string;
  count: number;
  href: string;
  items: Array<{ id: string; primary: string; secondary: string }>;
  countOnly?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/40 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{title}</p>
        <span
          className={cn(
            "rounded-full px-2 py-0.5  text-xs font-bold",
            count > 0 ? "bg-amber-500/20 text-amber-200" : "bg-muted text-muted-foreground",
          )}
        >
          {count}
        </span>
      </div>
      {!countOnly && items.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {items.slice(0, 5).map((item) => (
            <li key={item.id} className="text-xs">
              <span className="font-medium">{item.primary}</span>
              <span className="text-muted-foreground"> · {item.secondary}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <Link
        href={href}
        className="mt-3 inline-flex items-center gap-1 font-display text-xs font-medium uppercase tracking-[0.16em] text-cyan-400 hover:underline"
      >
        관리 화면
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

function ServiceRow({
  label,
  status,
}: {
  label: string;
  status: { ok: boolean; configured: boolean; detail?: string };
}) {
  return (
    <li className="flex items-center gap-2 rounded-xl border border-border/50 bg-card/50 px-3 py-2 text-sm">
      <StatusDot ok={status.ok} />
      <Database className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      <span>{label}</span>
      <span className="ml-auto text-[10px] text-muted-foreground">
        {status.ok ? "OK" : status.detail ?? "ERR"}
      </span>
    </li>
  );
}

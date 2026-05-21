import Link from "next/link";
import type { ComponentType } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Calculator,
  ClipboardList,
  FileBarChart,
  MessageSquareText,
  Monitor,
  Plus,
  Users,
} from "lucide-react";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { loadAdminDashboardData } from "@/lib/admin-dashboard-data";
import { AdminDashboardCharts } from "@/components/admin/admin-dashboard-charts";
import { AdminWebVitalsCard } from "@/components/admin/admin-web-vitals-card";
import { AdminBrokenImagesCard } from "@/components/admin/admin-broken-images-card";
import { loadWebVitalsSummary } from "@/lib/web-vitals-summary";
import { scanBrokenMediaImages } from "@/lib/media-image-health";
import type { MediaImageHealthResult } from "@/lib/media-image-health";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

function FeedList({
  title,
  icon: Icon,
  items,
  empty,
  viewAllHref,
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  items: {
    id: string;
    title: string;
    subtitle: string;
    time: string;
    href: string;
    badge?: string;
  }[];
  empty: string;
  viewAllHref: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
        <h2 className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          <Icon className="h-4 w-4 text-cyan-400/80" aria-hidden />
          [ {title} ]
        </h2>
        <Link
          href={viewAllHref}
          className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/70 hover:text-foreground"
        >
          전체
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <ul className="divide-y divide-border/50">
        {items.length === 0 ? (
          <li className="px-4 py-10 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            {`// `}
            {empty}
          </li>
        ) : (
          items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="flex items-start justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/30"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{item.title}</p>
                  <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                    {item.subtitle}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  {item.badge ? (
                    <span className="mb-1 inline-flex rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-white/70">
                      {item.badge}
                    </span>
                  ) : null}
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {item.time}
                  </p>
                </div>
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

export default async function AdminOverviewPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  const prefix = `/${locale}`;
  const [data, webVitals, imageHealth] = await Promise.all([
    loadAdminDashboardData(locale),
    loadWebVitalsSummary(7),
    scanBrokenMediaImages().catch(
      (): MediaImageHealthResult => ({
        scanned: 0,
        broken: [],
        checkedAt: new Date().toISOString(),
      }),
    ),
  ]);

  const quickActions = [
    {
      href: `${prefix}/admin/medias/quick-add`,
      label: "신규 매체 등록",
      icon: Plus,
    },
    {
      href: `${prefix}/admin/inquiries`,
      label: "문의 확인하기",
      icon: MessageSquareText,
    },
    {
      href: `${prefix}/admin/quotes/new`,
      label: "견적서 작성",
      icon: Calculator,
    },
    {
      href: `${prefix}/admin/reports/new`,
      label: "리포트 생성",
      icon: FileBarChart,
    },
  ];

  return (
    <div className="space-y-6 text-foreground">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-400/80">
            [ OPERATIONS HUB ]
          </p>
          <h1 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">
            운영 대시보드
          </h1>
          <p className="mt-1 font-mono text-[11px] tracking-tight text-muted-foreground">
            {`// `}
            {data.configured
              ? "실시간 DB · KPI · 미처리 알림"
              : "DB 미연결 — 일부 지표를 표시할 수 없습니다"}
          </p>
        </div>
      </header>

      {data.alerts.length > 0 ? (
        <section className="rounded-2xl border border-red-500/35 bg-red-500/10 p-4 backdrop-blur">
          <p className="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-red-200">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            [ 미처리 항목 ]
          </p>
          <ul className="flex flex-wrap gap-2">
            {data.alerts.map((a) => (
              <li key={a.id}>
                <Link
                  href={a.href}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-400/40 bg-red-950/40 px-3 py-2 text-sm font-semibold text-red-50 transition hover:bg-red-950/60"
                >
                  {a.label}
                  <span className="inline-flex min-w-[1.25rem] justify-center rounded-full bg-red-500 px-1.5 py-0.5 font-mono text-[10px] font-black text-white">
                    {a.count}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="grid grid-cols-1 gap-0 overflow-hidden rounded-2xl border border-border/60 bg-card/30 sm:grid-cols-2 xl:grid-cols-3">
        {data.kpis.map((kpi, idx) => (
          <Link key={kpi.label} href={kpi.href}>
            <div
              className={[
                "relative h-full p-4 transition-colors hover:bg-muted/40",
                idx > 0 ? "border-t border-border/60 sm:border-t-0 sm:border-l" : "",
                idx >= 2 ? "xl:border-t-0" : "",
              ].join(" ")}
            >
              {kpi.alert ? (
                <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.9)]" />
              ) : null}
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                {kpi.label}
              </p>
              <p className="mt-2 text-2xl font-black tabular-nums">{kpi.value}</p>
              {kpi.delta ? (
                <p
                  className={[
                    "mt-1 font-mono text-[11px] font-bold",
                    kpi.deltaUp ? "text-emerald-400" : "text-amber-300",
                  ].join(" ")}
                >
                  {kpi.delta}
                </p>
              ) : null}
            </div>
          </Link>
        ))}
      </section>

      <section>
        <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          [ 빠른 액션 ]
        </p>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {quickActions.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/50 px-3 py-3 text-sm font-bold transition hover:border-cyan-400/30 hover:bg-card/80"
            >
              <Icon className="h-4 w-4 shrink-0 text-cyan-400/90" aria-hidden />
              <span className="min-w-0 truncate">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      <AdminWebVitalsCard summary={webVitals} />

      <AdminBrokenImagesCard locale={locale} result={imageHealth} />

      {data.configured ? (
        <AdminDashboardCharts
          weeklyInquiries={data.weeklyInquiries}
          inquiriesByType={data.inquiriesByType}
        />
      ) : null}

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <FeedList
          title="최근 문의"
          icon={MessageSquareText}
          items={data.recentInquiries}
          empty="문의 없음"
          viewAllHref={`${prefix}/admin/inquiries`}
        />
        <FeedList
          title="최근 가입"
          icon={Users}
          items={data.recentSignups}
          empty="가입 없음"
          viewAllHref={`${prefix}/admin/users`}
        />
        <FeedList
          title="매체 신청"
          icon={ClipboardList}
          items={data.recentApplications}
          empty="신청 없음"
          viewAllHref={`${prefix}/admin/applications`}
        />
      </section>

      <section className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {[
          { href: `${prefix}/admin/medias`, label: "매체 관리", icon: Monitor },
          {
            href: `${prefix}/admin/campaigns`,
            label: "캠페인",
            icon: FileBarChart,
          },
          {
            href: `${prefix}/admin/inquiries`,
            label: "문의",
            icon: MessageSquareText,
          },
          { href: `${prefix}/admin/quotes`, label: "견적서", icon: Calculator },
        ].map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}>
            <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/40 px-3 py-3 transition hover:bg-muted/30">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.14em]">
                {label}
              </span>
              <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}

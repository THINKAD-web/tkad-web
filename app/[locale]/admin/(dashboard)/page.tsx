// app/[locale]/admin/(dashboard)/page.tsx
// 설명: Admin Overview — 실 DB 기반 통계 + 최근 활동 (목업 제거)

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Monitor,
  ShieldAlert,
  FileText,
  Wallet,
  Plus,
  ArrowRight,
  MessageSquareText,
  Clock,
} from "lucide-react";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

function formatKRW(v: number): string {
  return `₩${new Intl.NumberFormat("ko-KR").format(v)}`;
}
function formatDateTime(d: Date): string {
  return d.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function loadStats() {
  if (!isDatabaseConfigured()) {
    return {
      totalMedia: 0,
      pendingVerification: 0,
      quotesThisMonth: 0,
      totalRevenue: 0,
      recentInquiries: [] as Array<{
        id: string;
        company: string | null;
        name: string;
        createdAt: Date;
      }>,
      recentQuotes: [] as Array<{
        id: string;
        clientCompany: string | null;
        clientName: string;
        totalAmount: number;
        createdAt: Date;
        status: string;
      }>,
    };
  }
  const db = getPrisma();
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    totalMedia,
    pendingVerification,
    quotesThisMonth,
    revenueAgg,
    recentInquiries,
    recentQuotes,
  ] = await Promise.all([
    db.media.count({ where: { isActive: true } }),
    db.media.count({ where: { isActive: true, visibilityScore: { lte: 0 } } }),
    db.ooHQuote.count({ where: { createdAt: { gte: startOfMonth } } }),
    db.ooHQuote.aggregate({
      where: { status: { in: ["payment_confirmed", "contract_confirmed"] } },
      _sum: { totalAmount: true },
    }),
    db.contactInquiry
      .findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          company: true,
          name: true,
          createdAt: true,
        },
      })
      .catch(() => []),
    db.ooHQuote.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        clientCompany: true,
        clientName: true,
        totalAmount: true,
        createdAt: true,
        status: true,
      },
    }),
  ]);

  return {
    totalMedia,
    pendingVerification,
    quotesThisMonth,
    totalRevenue: revenueAgg._sum.totalAmount ?? 0,
    recentInquiries,
    recentQuotes,
  };
}

export default async function AdminOverviewPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  const s = await loadStats();

  const statCards = [
    {
      label: "총 매체 수",
      value: s.totalMedia.toLocaleString("ko-KR"),
      icon: Monitor,
      tone: "bg-blue-50 text-blue-600 border-blue-100",
      href: `/${locale}/admin/medias`,
    },
    {
      label: "검증 대기",
      value: s.pendingVerification.toLocaleString("ko-KR"),
      icon: ShieldAlert,
      tone: "bg-amber-50 text-amber-700 border-amber-100",
      href: `/${locale}/admin/verification`,
    },
    {
      label: "이번 달 견적서",
      value: s.quotesThisMonth.toLocaleString("ko-KR"),
      icon: FileText,
      tone: "bg-indigo-50 text-indigo-600 border-indigo-100",
      href: `/${locale}/admin/quotes`,
    },
    {
      label: "누적 매출 (확정)",
      value: formatKRW(s.totalRevenue),
      icon: Wallet,
      tone: "bg-emerald-50 text-emerald-600 border-emerald-100",
      href: `/${locale}/admin/quotes`,
    },
  ];

  return (
    <div className="space-y-6 text-bx-black dark:text-bx-white">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
            [ ADMIN DASHBOARD ]
          </p>
          <h1 className="mt-2 text-xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 font-mono text-[11px] tracking-tight text-bx-gray-dim">
            {`// `}THINKAD 운영 현황 · 실시간 DB 기반
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/${locale}/admin/medias/quick-add`}>
            <button
              type="button"
              className="inline-flex items-center gap-2 border-2 border-bx-black bg-bx-white px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-bx-black transition-colors hover:bg-bx-off dark:border-bx-white dark:bg-bx-black dark:text-bx-white dark:hover:bg-bx-gray-dim/30"
            >
              <Plus className="h-4 w-4" />
              매체 추가
            </button>
          </Link>
          <Link href={`/${locale}/admin/verification`}>
            <button
              type="button"
              className="inline-flex items-center gap-2 border-2 border-bx-black bg-bx-black px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-bx-white transition-colors hover:bg-bx-accent hover:border-bx-accent dark:border-bx-white dark:bg-bx-white dark:text-bx-black dark:hover:bg-bx-accent dark:hover:border-bx-accent dark:hover:text-bx-white"
            >
              <ShieldAlert className="h-4 w-4" />
              검증 큐
            </button>
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-0 border-2 border-bx-black bg-bx-white dark:border-bx-white dark:bg-bx-black sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon, tone: _tone, href }, idx) => (
          <Link key={label} href={href}>
            <div
              className={[
                "h-full p-4 transition-colors hover:bg-bx-off dark:hover:bg-bx-gray-dim/30",
                idx > 0 ? "-ml-[2px] border-l-2 border-bx-black dark:border-bx-white" : "",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
                  [ {label} ]
                </p>
                <span className="inline-flex h-9 w-9 items-center justify-center border-2 border-bx-black bg-bx-accent text-bx-white dark:border-bx-white">
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-3 text-2xl font-bold tabular-nums">{value}</div>
            </div>
          </Link>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="border-2 border-bx-black bg-bx-white dark:border-bx-white dark:bg-bx-black">
          <div className="flex items-center justify-between gap-3 border-b-2 border-bx-black px-4 py-3 dark:border-bx-white">
            <h2 className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em]">
              <MessageSquareText className="h-4 w-4 text-bx-accent" />
              [ 최근 문의 ]
            </h2>
            <Link
              href={`/${locale}/admin/inquiries`}
              className="inline-flex items-center gap-1 border-b-2 border-bx-black pb-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-bx-black transition-colors hover:text-bx-accent hover:border-bx-accent dark:border-bx-white dark:text-bx-white"
            >
              전체
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-bx-black/10 dark:divide-bx-white/15">
            {s.recentInquiries.length === 0 ? (
              <p className="px-4 py-10 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-bx-gray-dim">
                {`// `}문의가 없습니다
              </p>
            ) : (
              s.recentInquiries.map((i) => (
                <div key={i.id} className="flex items-center justify-between gap-2 px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold">{i.company}</div>
                    <div className="truncate font-mono text-[11px] text-bx-gray-dim">
                      {i.name} · {formatDateTime(i.createdAt)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="border-2 border-bx-black bg-bx-white dark:border-bx-white dark:bg-bx-black">
          <div className="flex items-center justify-between gap-3 border-b-2 border-bx-black px-4 py-3 dark:border-bx-white">
            <h2 className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em]">
              <FileText className="h-4 w-4 text-bx-accent" />
              [ 최근 견적서 ]
            </h2>
            <Link
              href={`/${locale}/admin/quotes`}
              className="inline-flex items-center gap-1 border-b-2 border-bx-black pb-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-bx-black transition-colors hover:text-bx-accent hover:border-bx-accent dark:border-bx-white dark:text-bx-white"
            >
              전체
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-bx-black/10 dark:divide-bx-white/15">
            {s.recentQuotes.length === 0 ? (
              <p className="px-4 py-10 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-bx-gray-dim">
                {`// `}견적서가 없습니다
              </p>
            ) : (
              s.recentQuotes.map((q) => (
                <div key={q.id} className="flex items-center justify-between gap-2 px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold">
                      {q.clientCompany ?? q.clientName}
                    </div>
                    <div className="truncate font-mono text-[11px] text-bx-gray-dim">
                      #{q.id.slice(-8)} · {formatDateTime(q.createdAt)}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-mono text-[12px] font-bold tabular-nums text-bx-black dark:text-bx-white">
                      {formatKRW(q.totalAmount)}
                    </div>
                    <span className="mt-1 inline-flex border-2 border-bx-black bg-bx-accent px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-bx-white dark:border-bx-white">
                      {q.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: `/${locale}/admin/medias`, label: "매체 관리", icon: Monitor },
          { href: `/${locale}/admin/verification`, label: "검증 큐", icon: ShieldAlert },
          { href: `/${locale}/admin/quotes`, label: "견적서", icon: FileText },
          { href: `/${locale}/admin/users`, label: "사용자", icon: Clock },
        ].map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}>
            <div className="border-2 border-bx-black bg-bx-white p-3 transition-colors hover:bg-bx-off dark:border-bx-white dark:bg-bx-black dark:hover:bg-bx-gray-dim/30">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-bx-gray-dim" />
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.18em]">
                  {label}
                </span>
                <ArrowRight className="ml-auto h-3.5 w-3.5 text-bx-gray-dim" />
              </div>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}

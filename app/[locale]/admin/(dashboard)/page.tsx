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
    <div className="space-y-5">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            THINKAD 운영 현황 · 실시간 DB 기반
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/${locale}/admin/medias/quick-add`}>
            <Button variant="outline" size="sm">
              <Plus className="w-4 h-4" />
              매체 추가
            </Button>
          </Link>
          <Link href={`/${locale}/admin/verification`}>
            <Button size="sm">
              <ShieldAlert className="w-4 h-4" />
              검증 큐
            </Button>
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map(({ label, value, icon: Icon, tone, href }) => (
          <Link key={label} href={href}>
            <Card className="h-full hover:border-primary/40 hover:shadow-md transition-all">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-500">{label}</span>
                  <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border ${tone}`}>
                    <Icon className="w-4 h-4" />
                  </span>
                </div>
                <div className="text-2xl font-bold text-slate-900 tabular-nums truncate">
                  {value}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquareText className="w-4 h-4 text-slate-500" />
              최근 문의
            </CardTitle>
            <Link
              href={`/${locale}/admin/inquiries`}
              className="text-xs text-slate-500 hover:text-primary inline-flex items-center gap-0.5"
            >
              전체
              <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent className="pt-0 divide-y divide-slate-100">
            {s.recentInquiries.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">문의가 없습니다</p>
            ) : (
              s.recentInquiries.map((i) => (
                <div key={i.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-800 truncate">
                      {i.company}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {i.name} · {formatDateTime(i.createdAt)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" />
              최근 견적서
            </CardTitle>
            <Link
              href={`/${locale}/admin/quotes`}
              className="text-xs text-slate-500 hover:text-primary inline-flex items-center gap-0.5"
            >
              전체
              <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent className="pt-0 divide-y divide-slate-100">
            {s.recentQuotes.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">견적서가 없습니다</p>
            ) : (
              s.recentQuotes.map((q) => (
                <div key={q.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-800 truncate">
                      {q.clientCompany ?? q.clientName}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      #{q.id.slice(-8)} · {formatDateTime(q.createdAt)}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-bold text-primary tabular-nums">
                      {formatKRW(q.totalAmount)}
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {q.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: `/${locale}/admin/medias`, label: "매체 관리", icon: Monitor },
          { href: `/${locale}/admin/verification`, label: "검증 큐", icon: ShieldAlert },
          { href: `/${locale}/admin/quotes`, label: "견적서", icon: FileText },
          { href: `/${locale}/admin/users`, label: "사용자", icon: Clock },
        ].map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}>
            <Card className="hover:border-primary/40 hover:shadow-md transition-all">
              <CardContent className="p-3 flex items-center gap-2">
                <Icon className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-700">{label}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-300 ml-auto" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  );
}

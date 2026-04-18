"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Award,
  CalendarDays,
  Clock,
  MapPin,
  MessageSquareText,
  Monitor,
  Percent,
  Printer,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { usePathname } from "next/navigation";

type RecentInquiry = {
  id: string;
  company: string;
  name: string;
  phone: string;
  status: string;
  createdAt: string;
};

type MonthlySeries = {
  key: string;
  label: string;
  inquiries: number;
  quotes: number;
  revenueKrw: number;
};

type LiveStats = {
  configured: boolean;
  monthlyRevenueKrw: number;
  inquiryConversionPct: number;
  topMedia: { id: string; name: string; picks: number }[];
  inquiries30d: number;
  quotes30d: number;
  mediaTotal: number;
  pendingInquiries: number;
  recentInquiries: RecentInquiry[];
  monthlySeries: MonthlySeries[];
  funnel: { inquiries: number; quotes: number; pastProposal: number; contracted: number };
  regionQuotes: { region: string; count: number }[];
};

const statusMap: Record<string, { label: string; className: string }> = {
  pending:    { label: "대기",   className: "bg-amber-100 text-amber-700" },
  processing: { label: "처리중", className: "bg-blue-100 text-blue-700" },
  completed:  { label: "완료",   className: "bg-emerald-100 text-emerald-700" },
};

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-slate-100 ${className}`} />;
}

export default function AdminDashboardPage() {
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "ko";
  const [live, setLive] = useState<LiveStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((data) => { if (!cancelled) { setLive(data as LiveStats); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const isConfigured = live?.configured === true;

  const statsCards = [
    {
      label: "활성 매체 수",
      value: isConfigured ? live!.mediaTotal : null,
      icon: Monitor,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "총 문의 수",
      value: isConfigured ? live!.funnel.inquiries : null,
      icon: MessageSquareText,
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "이번 달 문의",
      value: isConfigured ? live!.inquiries30d : null,
      icon: CalendarDays,
      color: "bg-amber-50 text-amber-600",
    },
    {
      label: "대기 중 문의",
      value: isConfigured ? live!.pendingInquiries : null,
      icon: Clock,
      color: "bg-rose-50 text-rose-600",
    },
  ];

  const monthlyData = isConfigured ? live!.monthlySeries : [];
  const maxMonthly = Math.max(...monthlyData.map((d) => d.inquiries), 1);

  const regionData = isConfigured
    ? (() => {
        const total = live!.regionQuotes.reduce((s, r) => s + r.count, 0) || 1;
        const colors = ["bg-navy", "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-violet-500"];
        return live!.regionQuotes.slice(0, 5).map((r, i) => ({
          region: r.region,
          count: r.count,
          percentage: Math.round((r.count / total) * 1000) / 10,
          color: colors[i % colors.length],
        }));
      })()
    : [];

  return (
    <div className="space-y-6 print-dashboard">
      {/* Print / DB notice */}
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        {live && !isConfigured ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            DATABASE_URL을 설정하면 실데이터가 표시됩니다.{" "}
            <a href="https://neon.tech" target="_blank" rel="noopener noreferrer" className="underline">Neon 무료 DB →</a>
          </p>
        ) : <span />}
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          인쇄
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statsCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4 py-0">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${stat.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                  {loading ? (
                    <Skeleton className="mt-1 h-7 w-20" />
                  ) : stat.value != null ? (
                    <p className="text-2xl font-bold text-navy">{stat.value.toLocaleString()}</p>
                  ) : (
                    <p className="text-2xl font-bold text-slate-300">—</p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent inquiries + Monthly chart */}
      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">최근 문의</CardTitle>
            <Link href={`/${locale}/admin/inquiries`} className="text-xs font-medium text-gold hover:underline">
              전체 보기 →
            </Link>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                    <th className="pb-3 pr-4">회사명</th>
                    <th className="pb-3 pr-4">담당자</th>
                    <th className="pb-3 pr-4 hidden sm:table-cell">날짜</th>
                    <th className="pb-3">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-3 pr-4"><Skeleton className="h-4 w-28" /></td>
                        <td className="py-3 pr-4"><Skeleton className="h-4 w-16" /></td>
                        <td className="py-3 pr-4 hidden sm:table-cell"><Skeleton className="h-4 w-20" /></td>
                        <td className="py-3"><Skeleton className="h-5 w-12 rounded-full" /></td>
                      </tr>
                    ))
                  ) : !isConfigured ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-xs text-muted-foreground">
                        DB 연결 후 실제 문의가 표시됩니다.
                      </td>
                    </tr>
                  ) : live!.recentInquiries.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-xs text-muted-foreground">
                        문의 내역이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    live!.recentInquiries.map((inq) => (
                      <tr key={inq.id} className="border-b last:border-0">
                        <td className="py-3 pr-4 font-medium text-navy">{inq.company}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{inq.name}</td>
                        <td className="py-3 pr-4 text-muted-foreground hidden sm:table-cell">
                          {new Date(inq.createdAt).toLocaleDateString("ko-KR")}
                        </td>
                        <td className="py-3">
                          <Badge variant="secondary" className={(statusMap[inq.status] ?? statusMap.pending).className}>
                            {(statusMap[inq.status] ?? statusMap.pending).label}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Monthly chart */}
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-center gap-2">
            <TrendingUp className="h-4 w-4 text-gold" />
            <CardTitle className="text-base">월별 문의 추이</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-end gap-3 pt-2" style={{ height: 200 }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                    <Skeleton className="h-3 w-8" />
                    <div className="w-full animate-pulse rounded-t-md bg-slate-100" style={{ height: `${40 + i * 15}px` }} />
                    <Skeleton className="h-3 w-6" />
                  </div>
                ))}
              </div>
            ) : monthlyData.length === 0 ? (
              <p className="py-12 text-center text-xs text-muted-foreground">DB 연결 후 데이터가 표시됩니다.</p>
            ) : (
              <div className="flex items-end gap-3 pt-2" style={{ height: 200 }}>
                {monthlyData.map((d) => (
                  <div key={d.key} className="flex flex-1 flex-col items-center gap-1.5">
                    <span className="text-xs font-semibold text-navy">{d.inquiries}</span>
                    <div
                      className="w-full rounded-t-md bg-gradient-to-t from-navy to-navy-light transition-all"
                      style={{ height: `${(d.inquiries / maxMonthly) * 140}px`, minHeight: 4 }}
                    />
                    <span className="text-[11px] text-muted-foreground">{d.label}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Popular media + Conversion + Region */}
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader className="flex-row items-center gap-2">
            <Award className="h-4 w-4 text-gold" />
            <CardTitle className="text-base">인기 매체 TOP {isConfigured ? live!.topMedia.length : "—"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 border-b border-slate-100 pb-3 last:border-0">
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))
            ) : !isConfigured || live!.topMedia.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">DB 연결 후 표시됩니다.</p>
            ) : (
              live!.topMedia.map((m, i) => (
                <div key={m.id} className="flex items-center gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold text-sm font-bold text-navy">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-navy">{m.name}</p>
                    <span className="text-xs text-muted-foreground">견적 {m.picks}회 포함</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-1">
          <CardHeader className="flex-row items-center gap-2">
            <Percent className="h-4 w-4 text-gold" />
            <CardTitle className="text-base">문의 → 견적 전환율</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <Skeleton className="h-12 w-24" />
            ) : !isConfigured ? (
              <p className="py-8 text-center text-xs text-muted-foreground">DB 연결 후 표시됩니다.</p>
            ) : (
              <>
                <div>
                  <p className="text-4xl font-bold text-gold">{live!.inquiryConversionPct}%</p>
                  <p className="mt-1 text-xs text-muted-foreground">최근 30일 기준</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span>문의 <span className="font-semibold text-navy">{live!.funnel.inquiries.toLocaleString()}건</span></span>
                    <span>견적 <span className="font-semibold text-navy">{live!.funnel.quotes.toLocaleString()}건</span></span>
                    <span>계약 <span className="font-semibold text-navy">{live!.funnel.contracted.toLocaleString()}건</span></span>
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">월별 문의·견적 추이</p>
                  <div className="flex items-end gap-2" style={{ height: 120 }}>
                    {live!.monthlySeries.map((d) => {
                      const maxQ = Math.max(...live!.monthlySeries.map((x) => x.quotes), 1);
                      return (
                        <div key={d.key} className="flex flex-1 flex-col items-center gap-1">
                          <span className="text-[10px] font-semibold text-navy">{d.quotes}</span>
                          <div
                            className="w-full rounded-t-sm bg-gradient-to-t from-navy to-navy-light"
                            style={{ height: `${(d.quotes / maxQ) * 72}px`, minHeight: 4 }}
                          />
                          <span className="text-[10px] text-muted-foreground">{d.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-1">
          <CardHeader className="flex-row items-center gap-2">
            <MapPin className="h-4 w-4 text-gold" />
            <CardTitle className="text-base">지역별 견적 분포</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-2.5 w-full rounded-full" />
                </div>
              ))
            ) : regionData.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">DB 연결 후 표시됩니다.</p>
            ) : (
              regionData.map((r) => (
                <div key={r.region} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium text-navy">{r.region}</span>
                    <span className="text-muted-foreground">{r.count.toLocaleString()}건 · {r.percentage}%</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${r.color}`} style={{ width: `${r.percentage}%` }} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

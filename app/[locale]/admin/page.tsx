"use client";

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
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const stats = [
  {
    label: "총 매체 수",
    value: 128,
    change: "+5",
    icon: Monitor,
    color: "bg-blue-50 text-blue-600",
  },
  {
    label: "총 문의 수",
    value: 347,
    change: "+23",
    icon: MessageSquareText,
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    label: "이번 달 문의",
    value: 42,
    change: "+12",
    icon: CalendarDays,
    color: "bg-amber-50 text-amber-600",
  },
  {
    label: "대기 중 문의",
    value: 18,
    change: "-3",
    icon: Clock,
    color: "bg-rose-50 text-rose-600",
  },
];

const recentInquiries = [
  {
    id: "INQ-347",
    company: "삼성전자",
    contact: "김영수",
    phone: "010-1234-5678",
    date: "2026-03-28",
    status: "pending" as const,
  },
  {
    id: "INQ-346",
    company: "LG유플러스",
    contact: "이미라",
    phone: "010-9876-5432",
    date: "2026-03-27",
    status: "processing" as const,
  },
  {
    id: "INQ-345",
    company: "현대자동차",
    contact: "박진호",
    phone: "010-5555-1234",
    date: "2026-03-26",
    status: "completed" as const,
  },
  {
    id: "INQ-344",
    company: "카카오",
    contact: "정수빈",
    phone: "010-3333-7890",
    date: "2026-03-25",
    status: "pending" as const,
  },
  {
    id: "INQ-343",
    company: "네이버",
    contact: "최은지",
    phone: "010-2222-4567",
    date: "2026-03-24",
    status: "processing" as const,
  },
];

const monthlyData = [
  { month: "10월", count: 28 },
  { month: "11월", count: 35 },
  { month: "12월", count: 31 },
  { month: "1월", count: 38 },
  { month: "2월", count: 45 },
  { month: "3월", count: 42 },
];

const popularMedia = [
  {
    rank: 1,
    name: "코엑스 K-POP 스퀘어 전광판",
    type: "디지털",
    inquiries: 45,
    trend: "+8",
  },
  {
    rank: 2,
    name: "강남대로 미디어폴 G-LIGHT",
    type: "디지털",
    inquiries: 38,
    trend: "+5",
  },
  {
    rank: 3,
    name: "뉴욕 타임스퀘어 전광판",
    type: "디지털",
    inquiries: 32,
    trend: "+12",
  },
  {
    rank: 4,
    name: "두바이 부르즈 할리파 LED",
    type: "디지털",
    inquiries: 28,
    trend: "+3",
  },
  {
    rank: 5,
    name: "성수동 반도 외벽광고",
    type: "빌보드",
    inquiries: 24,
    trend: "+6",
  },
];

const conversionData = {
  total: 347,
  contracted: 89,
  rate: 25.6,
  monthlyRates: [
    { month: "10월", rate: 22 },
    { month: "11월", rate: 24 },
    { month: "12월", rate: 23 },
    { month: "1월", rate: 26 },
    { month: "2월", rate: 28 },
    { month: "3월", rate: 25.6 },
  ],
};

const regionData = [
  { region: "서울", count: 198, percentage: 57.1, color: "bg-navy" },
  { region: "부산", count: 52, percentage: 15.0, color: "bg-blue-500" },
  { region: "제주", count: 34, percentage: 9.8, color: "bg-emerald-500" },
  {
    region: "전국(해외)",
    count: 63,
    percentage: 18.1,
    color: "bg-amber-500",
  },
];

const statusMap: Record<string, { label: string; className: string }> = {
  pending: { label: "대기", className: "bg-amber-100 text-amber-700" },
  processing: { label: "처리중", className: "bg-blue-100 text-blue-700" },
  completed: { label: "완료", className: "bg-emerald-100 text-emerald-700" },
};

export default function AdminDashboardPage() {
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "ko";
  const maxCount = Math.max(...monthlyData.map((d) => d.count));
  const maxConversionRate = Math.max(
    ...conversionData.monthlyRates.map((d) => d.rate),
  );

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4 py-0">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${stat.color}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {stat.label}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-navy">
                      {stat.value.toLocaleString()}
                    </span>
                    <span
                      className={`text-xs font-semibold ${
                        stat.change.startsWith("+")
                          ? "text-emerald-600"
                          : "text-rose-600"
                      }`}
                    >
                      {stat.change}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        {/* Recent Inquiries */}
        <Card className="xl:col-span-3">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">최근 문의</CardTitle>
            <Link
              href={`/${locale}/admin/inquiries`}
              className="text-xs font-medium text-gold hover:underline"
            >
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
                    <th className="pb-3 pr-4 hidden sm:table-cell">연락처</th>
                    <th className="pb-3 pr-4">날짜</th>
                    <th className="pb-3">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {recentInquiries.map((inq) => (
                    <tr key={inq.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium text-navy">
                        {inq.company}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {inq.contact}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground hidden sm:table-cell">
                        {inq.phone}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {inq.date}
                      </td>
                      <td className="py-3">
                        <Badge
                          variant="secondary"
                          className={statusMap[inq.status].className}
                        >
                          {statusMap[inq.status].label}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Chart */}
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-center gap-2">
            <TrendingUp className="h-4 w-4 text-gold" />
            <CardTitle className="text-base">월별 문의 추이</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3 pt-2" style={{ height: 200 }}>
              {monthlyData.map((d) => (
                <div
                  key={d.month}
                  className="flex flex-1 flex-col items-center gap-1.5"
                >
                  <span className="text-xs font-semibold text-navy">
                    {d.count}
                  </span>
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-navy to-navy-light transition-all"
                    style={{
                      height: `${(d.count / maxCount) * 140}px`,
                    }}
                  />
                  <span className="text-[11px] text-muted-foreground">
                    {d.month}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader className="flex-row items-center gap-2">
            <Award className="h-4 w-4 text-gold" />
            <CardTitle className="text-base">인기 매체 TOP 5</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {popularMedia.map((item) => (
              <div
                key={item.rank}
                className="flex items-center gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold text-sm font-bold text-navy">
                  {item.rank}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-navy">{item.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{item.type}</Badge>
                    <span className="text-xs text-muted-foreground">
                      문의 {item.inquiries}건
                    </span>
                  </div>
                </div>
                <span className="shrink-0 text-sm font-semibold text-emerald-600">
                  {item.trend}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="xl:col-span-1">
          <CardHeader className="flex-row items-center gap-2">
            <Percent className="h-4 w-4 text-gold" />
            <CardTitle className="text-base">계약 전환율</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-4xl font-bold text-gold">
                {conversionData.rate}%
              </p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span>
                  총 문의{" "}
                  <span className="font-semibold text-navy">
                    {conversionData.total.toLocaleString()}건
                  </span>
                </span>
                <span>
                  계약{" "}
                  <span className="font-semibold text-navy">
                    {conversionData.contracted.toLocaleString()}건
                  </span>
                </span>
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                월별 전환율
              </p>
              <div className="flex items-end gap-2" style={{ height: 120 }}>
                {conversionData.monthlyRates.map((d) => (
                  <div
                    key={d.month}
                    className="flex flex-1 flex-col items-center gap-1"
                  >
                    <span className="text-[10px] font-semibold text-navy">
                      {d.rate}%
                    </span>
                    <div
                      className="w-full rounded-t-sm bg-gradient-to-t from-navy to-navy-light"
                      style={{
                        height: `${(d.rate / maxConversionRate) * 72}px`,
                        minHeight: 4,
                      }}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {d.month}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-1">
          <CardHeader className="flex-row items-center gap-2">
            <MapPin className="h-4 w-4 text-gold" />
            <CardTitle className="text-base">지역별 문의 분포</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {regionData.map((r) => (
              <div key={r.region} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium text-navy">{r.region}</span>
                  <span className="text-muted-foreground">
                    {r.count.toLocaleString()}건 · {r.percentage}%
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${r.color}`}
                    style={{ width: `${r.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

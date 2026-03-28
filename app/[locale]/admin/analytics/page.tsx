"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Award,
  Percent,
  MapPin,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

const monthlyInquiries = [
  { month: "2025.10", label: "10월", count: 28, quotes: 12 },
  { month: "2025.11", label: "11월", count: 35, quotes: 15 },
  { month: "2025.12", label: "12월", count: 31, quotes: 18 },
  { month: "2026.01", label: "1월", count: 38, quotes: 21 },
  { month: "2026.02", label: "2월", count: 45, quotes: 25 },
  { month: "2026.03", label: "3월", count: 42, quotes: 28 },
];

const popularMedia = [
  { rank: 1, name: "코엑스 K-POP 스퀘어 전광판", type: "디지털", inquiries: 45, quotes: 18, trend: "+8" },
  { rank: 2, name: "강남대로 미디어폴 G-LIGHT", type: "디지털", inquiries: 38, quotes: 14, trend: "+5" },
  { rank: 3, name: "뉴욕 타임스퀘어 전광판", type: "디지털", inquiries: 32, quotes: 22, trend: "+12" },
  { rank: 4, name: "두바이 부르즈 할리파 LED", type: "디지털", inquiries: 28, quotes: 15, trend: "+3" },
  { rank: 5, name: "성수동 반도 외벽광고", type: "빌보드", inquiries: 24, quotes: 9, trend: "+6" },
];

const conversionFunnel = [
  { stage: "문의", count: 347, color: "bg-blue-500" },
  { stage: "견적 요청", count: 189, color: "bg-amber-500" },
  { stage: "협의 중", count: 124, color: "bg-purple-500" },
  { stage: "계약 체결", count: 89, color: "bg-emerald-500" },
];

const regionData = [
  { region: "서울", count: 198, percentage: 57.1, color: "bg-navy" },
  { region: "부산", count: 52, percentage: 15.0, color: "bg-blue-500" },
  { region: "제주", count: 34, percentage: 9.8, color: "bg-emerald-500" },
  { region: "전국(해외)", count: 63, percentage: 18.1, color: "bg-amber-500" },
];

const conversionData = {
  total: 347,
  contracted: 89,
  rate: 25.6,
  prevRate: 23.1,
  monthlyRates: [
    { month: "10월", rate: 22 },
    { month: "11월", rate: 24 },
    { month: "12월", rate: 23 },
    { month: "1월", rate: 26 },
    { month: "2월", rate: 28 },
    { month: "3월", rate: 25.6 },
  ],
};

const kpiCards = [
  { label: "월평균 문의", value: "36.5건", change: "+14.2%", up: true },
  { label: "견적 요청률", value: "54.5%", change: "+8.3%", up: true },
  { label: "평균 견적 금액", value: "3,450만원", change: "+12.1%", up: true },
  { label: "계약 전환율", value: "25.6%", change: "-2.4%", up: false },
];

export default function AdminAnalyticsPage() {
  const maxMonthly = Math.max(...monthlyInquiries.map((d) => d.count));
  const maxConvRate = Math.max(...conversionData.monthlyRates.map((d) => d.rate));
  const maxFunnel = conversionFunnel[0].count;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-navy">분석 대시보드</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          문의, 견적, 계약 데이터를 한눈에 확인하세요
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="py-0">
              <p className="text-xs font-medium text-muted-foreground">
                {kpi.label}
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-navy">{kpi.value}</span>
                <span
                  className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
                    kpi.up ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {kpi.up ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {kpi.change}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader className="flex-row items-center gap-2">
            <BarChart3 className="h-4 w-4 text-gold" />
            <CardTitle className="text-base">월별 문의 / 견적 추이</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-navy" />
                문의
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-gold" />
                견적
              </span>
            </div>
            <div className="flex items-end gap-4 pt-2" style={{ height: 220 }}>
              {monthlyInquiries.map((d) => (
                <div key={d.month} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex w-full items-end gap-1">
                    <div className="flex flex-1 flex-col items-center gap-1">
                      <span className="text-[10px] font-semibold text-navy">
                        {d.count}
                      </span>
                      <div
                        className="w-full rounded-t-sm bg-gradient-to-t from-navy to-navy-light"
                        style={{ height: `${(d.count / maxMonthly) * 150}px` }}
                      />
                    </div>
                    <div className="flex flex-1 flex-col items-center gap-1">
                      <span className="text-[10px] font-semibold text-gold">
                        {d.quotes}
                      </span>
                      <div
                        className="w-full rounded-t-sm bg-gradient-to-t from-gold to-amber-300"
                        style={{ height: `${(d.quotes / maxMonthly) * 150}px` }}
                      />
                    </div>
                  </div>
                  <span className="text-[11px] text-muted-foreground">{d.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-center gap-2">
            <TrendingUp className="h-4 w-4 text-gold" />
            <CardTitle className="text-base">전환 퍼널</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {conversionFunnel.map((stage, i) => (
              <div key={stage.stage}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-navy">{stage.stage}</span>
                  <span className="text-muted-foreground">
                    {stage.count.toLocaleString()}건
                    {i > 0 && (
                      <span className="ml-1 text-xs text-navy/60">
                        ({((stage.count / conversionFunnel[i - 1].count) * 100).toFixed(0)}%)
                      </span>
                    )}
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${stage.color} transition-all`}
                    style={{ width: `${(stage.count / maxFunnel) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
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
                  <p className="truncate text-sm font-medium text-navy">
                    {item.name}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {item.type}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">
                      문의 {item.inquiries}건 · 견적 {item.quotes}건
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

        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <Percent className="h-4 w-4 text-gold" />
            <CardTitle className="text-base">계약 전환율</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-gold">
                  {conversionData.rate}%
                </span>
                <span
                  className={`inline-flex items-center gap-0.5 text-sm font-semibold ${
                    conversionData.rate >= conversionData.prevRate
                      ? "text-emerald-600"
                      : "text-rose-600"
                  }`}
                >
                  {conversionData.rate >= conversionData.prevRate ? (
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowDownRight className="h-3.5 w-3.5" />
                  )}
                  {Math.abs(conversionData.rate - conversionData.prevRate).toFixed(1)}%p
                </span>
              </div>
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
              <div className="flex items-end gap-2" style={{ height: 100 }}>
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
                        height: `${(d.rate / maxConvRate) * 60}px`,
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

        <Card>
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
            <div className="mt-2 border-t pt-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-navy">합계</span>
                <span className="font-semibold text-navy">
                  {regionData.reduce((s, r) => s + r.count, 0).toLocaleString()}건
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

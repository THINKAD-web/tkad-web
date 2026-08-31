"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
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
  Layers,
  Settings2,
} from "lucide-react";

const DEMO_MONTHLY = [
  { month: "2025.10", label: "10월", count: 28, quotes: 12 },
  { month: "2025.11", label: "11월", count: 35, quotes: 15 },
  { month: "2025.12", label: "12월", count: 31, quotes: 18 },
  { month: "2026.01", label: "1월", count: 38, quotes: 21 },
  { month: "2026.02", label: "2월", count: 45, quotes: 25 },
  { month: "2026.03", label: "3월", count: 42, quotes: 28 },
];

const DEMO_POPULAR = [
  { rank: 1, name: "코엑스 K-POP 스퀘어 전광판", type: "디지털", picks: 45, trend: "+8" },
  { rank: 2, name: "강남대로 미디어폴 G-LIGHT", type: "디지털", picks: 38, trend: "+5" },
  { rank: 3, name: "코엑스 파르나스 미디어타워", type: "디지털", picks: 32, trend: "+12" },
  { rank: 4, name: "지하철 2호선 성수역 디지털광고", type: "디지털", picks: 28, trend: "+3" },
  { rank: 5, name: "성수동 반도 외벽광고", type: "빌보드", picks: 24, trend: "+6" },
];

const DEMO_FUNNEL = [
  { stage: "문의", count: 347, color: "bg-blue-500" },
  { stage: "견적 요청", count: 189, color: "bg-amber-500" },
  { stage: "협의·제안 이후", count: 124, color: "bg-[color:var(--qp-accent)]" },
  { stage: "계약 단계+", count: 89, color: "bg-emerald-500" },
];

const DEMO_REGION = [
  { region: "서울", count: 198, percentage: 57.1, color: "bg-foreground" },
  { region: "부산", count: 52, percentage: 15.0, color: "bg-primary" },
  { region: "제주", count: 34, percentage: 9.8, color: "bg-muted-foreground" },
  { region: "전국", count: 63, percentage: 18.1, color: "bg-muted" },
];

const DEMO_CONV = {
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

const DEMO_KPIS = [
  { label: "월평균 문의", value: "36.5건", change: "+14.2%", up: true },
  { label: "견적 요청률", value: "54.5%", change: "+8.3%", up: true },
  { label: "이번 달 매출(유료)", value: "—", change: "DB 연동", up: true },
  { label: "문의→견적 전환(30일)", value: "—", change: "DB 연동", up: true },
];

type LiveStats = {
  configured: boolean;
  monthlyRevenueKrw: number;
  inquiryConversionPct: number;
  topMedia: { id: string; name: string; picks: number }[];
  inquiries30d: number;
  quotes30d: number;
  monthlySeries: {
    key: string;
    label: string;
    inquiries: number;
    quotes: number;
    revenueKrw: number;
  }[];
  funnel: {
    inquiries: number;
    quotes: number;
    pastProposal: number;
    contracted: number;
  };
  regionQuotes: { region: string; count: number }[];
  typeRevenueKrw: { type: string; totalKrw: number }[];
};

const REGION_COLORS = [
  "bg-foreground",
  "bg-primary",
  "bg-muted-foreground",
  "bg-muted",
  "bg-foreground",
  "bg-primary",
];

export default function AdminAnalyticsPage() {
  const pathname = usePathname();
  const [live, setLive] = useState<LiveStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) setLive(j as LiveStats);
      })
      .catch(() => {
        if (!cancelled) setLive(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const useDb = live?.configured === true;

  const monthlyInquiries = useMemo(() => {
    if (useDb && live!.monthlySeries?.length) {
      return live!.monthlySeries.map((m) => ({
        month: m.key,
        label: m.label,
        count: m.inquiries,
        quotes: m.quotes,
        revenueKrw: m.revenueKrw,
      }));
    }
    return DEMO_MONTHLY.map((d) => ({ ...d, revenueKrw: 0 }));
  }, [live, useDb]);

  const maxMonthly = Math.max(
    1,
    ...monthlyInquiries.map((d) => Math.max(d.count, d.quotes)),
  );

  const conversionFunnel = useMemo(() => {
    if (useDb && live!.funnel) {
      const f = live!.funnel;
      return [
        { stage: "문의", count: f.inquiries, color: "bg-blue-500" },
        { stage: "견적 요청", count: f.quotes, color: "bg-amber-500" },
        {
          stage: "제안 이후(캠페인)",
          count: f.pastProposal,
          color: "bg-[color:var(--qp-accent)]",
        },
        { stage: "계약 단계+", count: f.contracted, color: "bg-emerald-500" },
      ];
    }
    return DEMO_FUNNEL;
  }, [live, useDb]);

  const maxFunnel = Math.max(1, ...conversionFunnel.map((s) => s.count));

  const popularMedia = useMemo(() => {
    if (useDb && live!.topMedia?.length) {
      return live!.topMedia.slice(0, 10).map((m, i) => ({
        rank: i + 1,
        name: m.name,
        type: "DB",
        picks: m.picks,
        trend: "",
      }));
    }
    return DEMO_POPULAR;
  }, [live, useDb]);

  const regionData = useMemo(() => {
    if (useDb && live!.regionQuotes?.length) {
      const sum = live!.regionQuotes.reduce((s, r) => s + r.count, 0) || 1;
      return live!.regionQuotes.map((r, i) => ({
        region: r.region,
        count: r.count,
        percentage: Math.round((r.count / sum) * 1000) / 10,
        color: REGION_COLORS[i % REGION_COLORS.length],
      }));
    }
    return DEMO_REGION;
  }, [live, useDb]);

  const conversionData = useMemo(() => {
    if (useDb && live!.funnel && live!.monthlySeries?.length) {
      const f = live!.funnel;
      const contractRate =
        f.inquiries === 0
          ? 0
          : Math.round((f.contracted / f.inquiries) * 1000) / 10;
      const monthlyRates = live!.monthlySeries.map((m) => ({
        month: m.label,
        rate:
          m.inquiries === 0
            ? 0
            : Math.round((m.quotes / m.inquiries) * 1000) / 10,
      }));
      return {
        total: f.inquiries,
        contracted: f.contracted,
        rate: contractRate,
        prevRate: contractRate,
        monthlyRates,
      };
    }
    return DEMO_CONV;
  }, [live, useDb]);

  const maxConvRate = Math.max(
    1,
    ...conversionData.monthlyRates.map((d) => d.rate),
  );

  const kpiCards = useMemo(() => {
    if (!useDb || !live) return DEMO_KPIS;
    const avgInq =
      live.monthlySeries.length > 0
        ? Math.round(
            live.monthlySeries.reduce((s, m) => s + m.inquiries, 0) /
              live.monthlySeries.length,
          )
        : 0;
    return [
      {
        label: "최근 6개월 월평균 문의",
        value: `${avgInq}건`,
        change: "DB",
        up: true,
      },
      {
        label: "최근 30일 견적/문의",
        value: `${live.quotes30d}/${live.inquiries30d}`,
        change: `${live.inquiryConversionPct}%`,
        up: live.inquiryConversionPct >= 50,
      },
      {
        label: "이번 달 유료 매출",
        value: `${(live.monthlyRevenueKrw / 10000).toLocaleString()}만원`,
        change: "실결제 기준",
        up: true,
      },
      {
        label: "문의 대비 계약+",
        value:
          live.funnel.inquiries === 0
            ? "0%"
            : `${Math.round((live.funnel.contracted / live.funnel.inquiries) * 1000) / 10}%`,
        change: "파이프라인",
        up: true,
      },
    ];
  }, [live, useDb]);

  const typeRevenue = live?.typeRevenueKrw ?? [];
  const maxTypeRev = Math.max(1, ...typeRevenue.map((t) => t.totalKrw));
  const locale = pathname.split("/")[1] || "ko";

  return (
    <div className="space-y-6 text-foreground">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
            [ ANALYTICS ]
          </p>
          <h2 className="mt-2 text-xl font-bold tracking-tight">분석 대시보드</h2>
          <p className="mt-1 text-[11px] tracking-tight text-muted-foreground">
            {`// `}문의, 견적, 계약 데이터를 한눈에 확인하세요.
            {useDb ? (
              <span className="ml-2 text-primary">· DB 실데이터</span>
            ) : (
              <span className="ml-2 text-muted-foreground">
                · 샘플 화면(DB 미연결 시)
              </span>
            )}
          </p>
        </div>
        <Link
          href={`/${locale}/admin/analytics/settings`}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted"
        >
          <Settings2 className="h-4 w-4" />
          방문자 통계 설정
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="py-0">
              <p className="text-xs font-medium text-muted-foreground">
                {kpi.label}
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground">{kpi.value}</span>
                <span
                  className={`inline-flex items-center gap-0.5 text-xs font-semibold ${ kpi.up ? "text-emerald-600" : "text-rose-600" }`}
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
            <BarChart3 className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">월별 문의 / 견적 추이</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex flex-wrap gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-foreground dark:bg-card" />
                문의
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-primary" />
                견적
              </span>
              {useDb ? (
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-600" />
                  유료 매출(막대 높이: 만원 단위 스케일)
                </span>
              ) : null}
            </div>
            <div className="flex items-end gap-4 pt-2" style={{ height: 220 }}>
              {monthlyInquiries.map((d) => {
                const revH =
                  useDb && "revenueKrw" in d && d.revenueKrw > 0
                    ? Math.min(
                        60,
                        (d.revenueKrw / Math.max(1, maxMonthly * 50000)) * 60,
                      )
                    : 0;
                return (
                  <div
                    key={d.month}
                    className="flex flex-1 flex-col items-center gap-1"
                  >
                    <div className="flex w-full items-end gap-0.5">
                      <div className="flex flex-1 flex-col items-center gap-1">
                        <span className="text-[10px] font-semibold text-foreground">
                          {d.count}
                        </span>
                        <div
                          className="w-full rounded-t-sm bg-foreground dark:bg-card"
                          style={{
                            height: `${(d.count / maxMonthly) * 130}px`,
                            minHeight: 2,
                          }}
                        />
                      </div>
                      <div className="flex flex-1 flex-col items-center gap-1">
                        <span className="text-[10px] font-semibold text-primary">
                          {d.quotes}
                        </span>
                        <div
                          className="w-full rounded-t-sm bg-primary"
                          style={{
                            height: `${(d.quotes / maxMonthly) * 130}px`,
                            minHeight: 2,
                          }}
                        />
                      </div>
                      {useDb && revH > 0 ? (
                        <div className="flex flex-1 flex-col items-center gap-1">
                          <span className="text-[9px] font-semibold text-emerald-700">
                            {(d as { revenueKrw: number }).revenueKrw >=
                            100000000
                              ? `${Math.round((d as { revenueKrw: number }).revenueKrw / 100000000)}억`
                              : `${Math.round((d as { revenueKrw: number }).revenueKrw / 10000)}만`}
                          </span>
                          <div
                            className="w-full rounded-t-sm bg-emerald-600"
                            style={{ height: `${revH}px`, minHeight: 2 }}
                          />
                        </div>
                      ) : null}
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {d.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">전환 퍼널</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {conversionFunnel.map((stage, i) => (
              <div key={stage.stage}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{stage.stage}</span>
                  <span className="text-muted-foreground">
                    {stage.count.toLocaleString()}건
                    {i > 0 && conversionFunnel[i - 1].count > 0 ? (
                      <span className="ml-1 text-xs text-muted-foreground">
                        (
                        {(
                          (stage.count / conversionFunnel[i - 1].count) *
                          100
                        ).toFixed(0)}
                        %)
                      </span>
                    ) : null}
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${stage.color} transition-bar`}
                    style={{ width: `${(stage.count / maxFunnel) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-4">
        <Card className="xl:col-span-1">
          <CardHeader className="flex-row items-center gap-2">
            <Award className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">인기 매체 TOP 10</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[420px] space-y-3 overflow-y-auto">
            {popularMedia.map((item) => (
              <div
                key={item.rank}
                className="flex items-center gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {item.rank}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {item.name}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {item.type}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">
                      견적 선택 {item.picks}회
                    </span>
                  </div>
                </div>
                {item.trend ? (
                  <span className="shrink-0 text-sm font-semibold text-emerald-600">
                    {item.trend}
                  </span>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="xl:col-span-1">
          <CardHeader className="flex-row items-center gap-2">
            <Percent className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">계약·전환</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-primary">
                  {conversionData.rate}%
                </span>
                <span
                  className={`inline-flex items-center gap-0.5 text-sm font-semibold ${ conversionData.rate >= conversionData.prevRate ? "text-emerald-600" : "text-rose-600" }`}
                >
                  {conversionData.rate >= conversionData.prevRate ? (
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowDownRight className="h-3.5 w-3.5" />
                  )}
                  {useDb
                    ? "문의 대비 계약+"
                    : `${Math.abs(conversionData.rate - conversionData.prevRate).toFixed(1)}%p`}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span>
                  총 문의{" "}
                  <span className="font-semibold text-foreground">
                    {conversionData.total.toLocaleString()}건
                  </span>
                </span>
                <span>
                  계약+{" "}
                  <span className="font-semibold text-foreground">
                    {conversionData.contracted.toLocaleString()}건
                  </span>
                </span>
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                월별 문의→견적 비율
              </p>
              <div className="flex items-end gap-2" style={{ height: 100 }}>
                {conversionData.monthlyRates.map((d) => (
                  <div
                    key={d.month}
                    className="flex flex-1 flex-col items-center gap-1"
                  >
                    <span className="text-[10px] font-semibold text-foreground">
                      {d.rate}%
                    </span>
                    <div
                      className="w-full rounded-t-sm bg-foreground dark:bg-card"
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

        <Card className="xl:col-span-1">
          <CardHeader className="flex-row items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">지역별 견적 분포</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {regionData.map((r) => (
              <div key={r.region} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium text-foreground">{r.region}</span>
                  <span className="text-muted-foreground">
                    {r.count.toLocaleString()}건 · {r.percentage}%
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${r.color}`}
                    style={{ width: `${Math.min(100, r.percentage)}%` }}
                  />
                </div>
              </div>
            ))}
            <div className="mt-2 border-t pt-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">합계</span>
                <span className="font-semibold text-foreground">
                  {regionData.reduce((s, r) => s + r.count, 0).toLocaleString()}건
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-1">
          <CardHeader className="flex-row items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">유형별 매출</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!useDb || typeRevenue.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                유료 청구서와 캠페인 매체 예약이 연결되면 표시됩니다.
              </p>
            ) : (
              typeRevenue.slice(0, 10).map((t, i) => (
                <div key={t.type} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-foreground">{t.type}</span>
                    <span className="text-muted-foreground">
                      {(t.totalKrw / 10000).toLocaleString()}만원
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${REGION_COLORS[i % REGION_COLORS.length]}`}
                      style={{
                        width: `${(t.totalKrw / maxTypeRev) * 100}%`,
                      }}
                    />
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

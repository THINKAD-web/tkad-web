"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Download,
  Loader2,
  MapPin,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { AccessCheckResult } from "@/lib/report-access-shared";
import { ReportAccessGate } from "@/components/report-access-gate";
import type { MarketDashboardData, DistrictHeatCell } from "@/lib/insights/market-dashboard-data";
import { DISTRICT_TIER_COLORS } from "@/lib/insights/seoul-districts";
import { Link } from "@/i18n/navigation";
import { BRAND_ACCENT } from "@/lib/brand-palette";

const PIE_COLORS = [BRAND_ACCENT, "#1c1c1f", "#ec4899", "#f97316", "#6366f1", "#14b8a6", "#eab308"];
const LINE_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6"];

type Props = {
  isKo: boolean;
  access: AccessCheckResult;
};

function pctBadge(n: number, isKo: boolean) {
  const up = n >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-bold ${up ? "text-emerald-500" : "text-orange-500"}`}
    >
      {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
      {up ? "+" : ""}
      {n}%
      <span className="font-normal text-muted-foreground">
        {isKo ? " 전월" : " MoM"}
      </span>
    </span>
  );
}

export function MarketDashboardClient({ isKo, access }: Props) {
  const [data, setData] = useState<MarketDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedGu, setSelectedGu] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/insights/market?locale=${isKo ? "ko" : "en"}`,
          { cache: "no-store" },
        );
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok || !json.ok) {
          setErr(json.error?.message ?? "load_failed");
          return;
        }
        setData(json.data as MarketDashboardData);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "network");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isKo]);

  const selectedCell = useMemo(
    () => data?.districtHeatmap.find((c) => c.gu === selectedGu) ?? null,
    [data, selectedGu],
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const teaser = data ? (
    <KpiRow data={data} isKo={isKo} blurred />
  ) : (
    <div className="h-32 rounded-2xl border border-border bg-muted/30" />
  );

  const dashboard = data ? (
    <div className="space-y-8">
      <KpiRow data={data} isKo={isKo} />
      <DistrictSection
        cells={data.districtHeatmap}
        trend={data.districtTrend}
        trendGu={data.districtTrendGu}
        selected={selectedCell}
        onSelect={setSelectedGu}
        isKo={isKo}
      />
      <IndustrySection data={data} isKo={isKo} />
      <MediaTypeSection rows={data.mediaTypeEfficiency} isKo={isKo} />
      <DownloadSection isKo={isKo} access={access} />
      <p className="text-center text-xs text-muted-foreground">
        {isKo ? data.confidenceNoteKo : data.confidenceNoteEn}
      </p>
    </div>
  ) : (
    <p className="text-sm text-destructive">{err ?? "Error"}</p>
  );

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-primary">
          [ PRO · MARKET INSIGHTS ]
        </p>
        <h1 className="text-3xl font-black tracking-tight">
          {isKo ? "OOH 시장 인사이트" : "OOH market insights"}
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {isKo
            ? "실시간 매체·가격·업종 데이터로 구독 가치를 확인하세요. 매주 월요일 이메일 브리핑이 발송됩니다."
            : "Live media, pricing, and industry data. Weekly email brief every Monday."}
        </p>
        {!access.allowed ? (
          <Link
            href="/pricing?trial=1"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            <Sparkles className="h-4 w-4" />
            {isKo ? "PRO 14일 무료 체험" : "Start 14-day PRO trial"}
          </Link>
        ) : null}
      </header>

      <ReportAccessGate access={access} feature="market_dashboard" isKo={isKo}>
        {dashboard}
      </ReportAccessGate>

      {!access.allowed ? (
        <div className="pointer-events-none select-none blur-sm">{teaser}</div>
      ) : null}
    </div>
  );
}

function KpiRow({
  data,
  isKo,
  blurred,
}: {
  data: MarketDashboardData;
  isKo: boolean;
  blurred?: boolean;
}) {
  const k = data.kpis;
  const cards = [
    {
      label: isKo ? "이번 달 등록 매체" : "New media (month)",
      value: k.newMediaThisMonth,
      sub: pctBadge(k.newMediaMoMPercent, isKo),
    },
    {
      label: isKo ? "이번 달 집행 캠페인" : "Campaigns (month)",
      value: k.campaignsThisMonth,
      sub: null,
    },
    {
      label: isKo ? "평균 CPM" : "Avg CPM",
      value: `₩${k.avgCpmKrw.toLocaleString()}`,
      sub: pctBadge(k.avgCpmMoMPercent, isKo),
    },
    {
      label: isKo ? "가장 핫한 지역" : "Hottest region",
      value: k.hottestRegion,
      sub: null,
    },
  ];
  return (
    <div
      className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-4 ${blurred ? "opacity-60" : ""}`}
    >
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-2xl border border-border bg-card p-4 shadow-sm"
        >
          <p className="text-xs text-muted-foreground">{c.label}</p>
          <p className="mt-2 text-2xl font-black tabular-nums">{c.value}</p>
          {c.sub ? <div className="mt-1">{c.sub}</div> : null}
        </div>
      ))}
    </div>
  );
}

function DistrictSection({
  cells,
  trend,
  trendGu,
  selected,
  onSelect,
  isKo,
}: {
  cells: DistrictHeatCell[];
  trend: MarketDashboardData["districtTrend"];
  trendGu: string[];
  selected: DistrictHeatCell | null;
  onSelect: (gu: string | null) => void;
  isKo: boolean;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-lg font-bold">
        {isKo ? "서울 구별 OOH 단가 히트맵" : "Seoul district price heatmap"}
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        {isKo ? "클릭하면 구 상세 · 강남·서초 고가 / 외곽 저가" : "Click a district for detail"}
      </p>
      <div className="mt-4 grid grid-cols-3 gap-1.5 sm:grid-cols-5 lg:grid-cols-5">
        {cells.map((c) => (
          <button
            key={c.gu}
            type="button"
            onClick={() => onSelect(c.gu === selected?.gu ? null : c.gu)}
            className="rounded-lg px-2 py-2 text-center text-[10px] font-bold transition ring-offset-2 hover:ring-2 hover:ring-primary/40 sm:text-xs"
            style={{
              backgroundColor: DISTRICT_TIER_COLORS[c.tier],
              color: c.tier === "low" ? "#422006" : "#fff",
            }}
          >
            {c.gu.replace("구", "")}
            <span className="mt-0.5 block text-[9px] font-normal opacity-90">
              {c.avgPriceManwon.toLocaleString()}
              {isKo ? "만" : "M"}
            </span>
          </button>
        ))}
      </div>
      {selected ? (
        <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4 text-sm">
          <p className="font-bold">
            <MapPin className="mr-1 inline h-4 w-4" />
            {selected.gu}
          </p>
          <p className="mt-1 text-muted-foreground">
            {isKo ? "평균 월 단가" : "Avg monthly"}:{" "}
            <strong>{selected.avgPriceManwon.toLocaleString()}만원</strong> ·{" "}
            {isKo ? "매체" : "Media"} {selected.mediaCount}
            {isKo ? "곳" : ""}
          </p>
        </div>
      ) : null}
      <div className="mt-6 h-64">
        <p className="mb-2 text-sm font-semibold">
          {isKo ? "지난 6개월 가격 트렌드 (상위 5개 구)" : "6-month price trend (top 5 districts)"}
        </p>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.2)" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            {trendGu.map((gu, i) => (
              <Line
                key={gu}
                type="monotone"
                dataKey={gu}
                stroke={LINE_COLORS[i % LINE_COLORS.length]}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function IndustrySection({
  data,
  isKo,
}: {
  data: MarketDashboardData;
  isKo: boolean;
}) {
  return (
    <section className="grid gap-5 lg:grid-cols-2">
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-bold">
          {isKo ? "업종별 OOH 집행 점유율" : "Industry share"}
        </h2>
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.industryShare}
                dataKey="pct"
                nameKey="industry"
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={80}
                paddingAngle={2}
              >
                {data.industryShare.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-bold">
          {isKo ? "업종별 인사이트" : "Industry insights"}
        </h2>
        <ul className="mt-4 space-y-3">
          {data.industryInsights.map((row) => (
            <li key={row.industry} className="rounded-xl border border-border/60 p-3 text-sm">
              <p className="font-bold">{row.industry}</p>
              <p className="mt-1 text-muted-foreground">
                {isKo ? "평균 월" : "Avg monthly"}{" "}
                <strong>{row.avgBudgetManwon.toLocaleString()}만원</strong>,{" "}
                {row.popularTypes} {isKo ? "조합 선호" : "preferred"}
              </p>
              <p className="mt-1 text-xs text-primary">{row.seasonNote}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function MediaTypeSection({
  rows,
  isKo,
}: {
  rows: MarketDashboardData["mediaTypeEfficiency"];
  isKo: boolean;
}) {
  const chartData = rows.map((r) => ({
    name: r.label,
    cpm: r.avgCpm,
    roi: r.roiEstimate,
  }));
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-lg font-bold">
        {isKo ? "매체 유형별 효율 분석" : "Media type efficiency"}
      </h2>
      <div className="mt-4 h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="cpm" fill={BRAND_ACCENT} name="CPM" radius={[4, 4, 0, 0]} />
            <Bar dataKey="roi" fill="#1c1c1f" name="ROI est." radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {rows.map((r) => (
          <div key={r.type} className="rounded-xl border border-border/60 p-3 text-xs">
            <p className="font-bold text-sm">{r.label}</p>
            <p className="mt-1">
              CPM ₩{r.avgCpm.toLocaleString()} · {isKo ? "가시성" : "Vis"}{" "}
              {r.avgVisibility}
            </p>
            <p className="text-muted-foreground">
              {r.extraLabel} {r.extraMetric} · ROI {r.roiEstimate}%
            </p>
            <p className="mt-1 text-primary">
              {isKo ? "추천" : "Rec."}: {r.recommendedIndustries.join(", ")}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function DownloadSection({
  isKo,
  access,
}: {
  isKo: boolean;
  access: AccessCheckResult;
}) {
  if (!access.allowed) return null;
  const base = `/api/insights/market/export?locale=${isKo ? "ko" : "en"}`;
  const items = [
    { label: isKo ? "전체 데이터" : "All data", dataset: "all" },
    { label: isKo ? "매체 리스트" : "Media list", dataset: "media" },
    { label: isKo ? "지역 트렌드" : "District trends", dataset: "district" },
    { label: isKo ? "업종 통계" : "Industry stats", dataset: "industry" },
    { label: isKo ? "시즌 분석" : "Season analysis", dataset: "season" },
  ];
  return (
    <section className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-5">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <Download className="h-5 w-5" />
        {isKo ? "데이터 다운로드 (CSV)" : "Data download (CSV)"}
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        {isKo
          ? "ENTERPRISE는 JSON API: GET /api/v1/insights/market (Bearer API key)"
          : "ENTERPRISE: GET /api/v1/insights/market with Bearer API key"}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {items.map((item) => (
          <a
            key={item.dataset}
            href={`${base}&dataset=${item.dataset}`}
            className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold hover:border-primary"
          >
            {item.label}
          </a>
        ))}
      </div>
    </section>
  );
}

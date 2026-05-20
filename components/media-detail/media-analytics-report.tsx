"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MediaAnalyticsReport } from "@/lib/media-report-analytics";
import type { AccessCheckResult } from "@/lib/report-access-shared";
import { ReportAccessGate } from "@/components/report-access-gate";
import {
  DataAttributionList,
  OverallConfidenceBar,
} from "@/components/data-confidence-badge";

type Props = {
  report: MediaAnalyticsReport;
  isKo: boolean;
  access: AccessCheckResult;
};

const COMMERCE_COLORS = ["#f59e0b", "#6366f1", "#ec4899", "#22c55e"];
const TARGET_KEYS = ["mz", "office", "family", "tourist"] as const;

export function MediaAnalyticsReportSection({ report, isKo, access }: Props) {
  const commerceData = [
    { key: "cafe", label: isKo ? "카페" : "Café", value: report.commerce.cafe },
    { key: "office", label: isKo ? "오피스" : "Office", value: report.commerce.office },
    { key: "shopping", label: isKo ? "쇼핑" : "Shopping", value: report.commerce.shopping },
    {
      key: "residential",
      label: isKo ? "주거" : "Residential",
      value: report.commerce.residential,
    },
  ];

  const targetData = TARGET_KEYS.map((k) => ({
    key: k,
    label: isKo
      ? ({ mz: "MZ", office: "직장인", family: "가족", tourist: "관광객" }[k] ?? k)
      : ({ mz: "Gen MZ", office: "Office", family: "Family", tourist: "Tourist" }[k] ?? k),
    score: report.targets[k],
  }));

  const content = (
    <div className="space-y-10">
      {report.overallConfidence != null ? (
        <OverallConfidenceBar score={report.overallConfidence} isKo={isKo} />
      ) : null}
      {report.attributions?.length ? (
        <DataAttributionList attributions={report.attributions} isKo={isKo} />
      ) : null}

      <div>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
          [ {isKo ? "시간대별 유동" : "Time-slot heatmap"} ]
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {report.timeSlots.map((s) => (
            <div
              key={s.slot}
              className="rounded-xl border border-border bg-card p-3 text-center"
            >
              <p className="text-xs font-semibold text-muted-foreground">
                {isKo ? s.labelKo : s.labelEn}
              </p>
              <p className="mt-1 text-2xl font-black text-primary">{s.index}</p>
              <div className="mx-auto mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.min(100, s.index)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
          [ {isKo ? "요일별 노출 지수" : "Day-of-week index"} ]
        </p>
        <div className="mt-4 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={report.weeklyIndex}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis
                dataKey={isKo ? "dayKo" : "dayEn"}
                tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 11 }}
              />
              <YAxis tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: "#0c0c0f",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 8,
                }}
              />
              <Bar dataKey="index" fill="#22d3ee" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
          [ {isKo ? "주변 상권 (반경 500m)" : "Trade area (500m)"} ]
        </p>
        <div className="mt-4 h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={commerceData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis type="number" tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="label"
                width={64}
                tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 11 }}
              />
              <Tooltip />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {commerceData.map((_, i) => (
                  <Cell key={i} fill={COMMERCE_COLORS[i % COMMERCE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {isKo ? report.commerceInsightKo : report.commerceInsightEn}
        </p>
      </div>

      <div>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
          [ {isKo ? "경쟁 매체 비교" : "Competitor comparison"} ]
        </p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[480px] text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-3 py-2 font-bold">{isKo ? "매체" : "Media"}</th>
                <th className="px-3 py-2 font-bold">CPM</th>
                <th className="px-3 py-2 font-bold">{isKo ? "월 노출" : "Monthly imp."}</th>
                <th className="px-3 py-2 font-bold">{isKo ? "가시성" : "Visibility"}</th>
                <th className="px-3 py-2 font-bold">{isKo ? "거리" : "Dist."}</th>
              </tr>
            </thead>
            <tbody>
              {report.competitors.map((c) => (
                <tr key={c.id} className="border-b border-border/60 last:border-0">
                  <td className="px-3 py-2 font-semibold">{c.name}</td>
                  <td className="px-3 py-2">
                    {c.cpmKrw != null ? `₩${c.cpmKrw.toLocaleString()}` : "—"}
                  </td>
                  <td className="px-3 py-2">{c.monthlyImpressions.toLocaleString()}</td>
                  <td className="px-3 py-2">{c.visibilityScore}</td>
                  <td className="px-3 py-2">{c.distanceKm}km</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            [ {isKo ? "계절·시즌 지수" : "Season index"} ]
          </p>
          <ul className="mt-3 space-y-2">
            {report.seasons.map((s) => (
              <li
                key={s.seasonKo}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span>{isKo ? s.seasonKo : s.seasonEn}</span>
                <span className="font-bold text-primary">
                  {s.index}
                  {s.recommended ? (isKo ? " · 권장" : " · rec.") : ""}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            {isKo ? report.seasonInsightKo : report.seasonInsightEn}
          </p>
        </div>
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            [ {isKo ? "타겟 적합도" : "Target fit"} ]
          </p>
          <ul className="mt-3 space-y-2">
            {targetData.map((t) => (
              <li key={t.key}>
                <div className="flex justify-between text-xs font-semibold">
                  <span>{t.label}</span>
                  <span>{t.score}/100</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${t.score}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            {isKo ? report.targetInsightKo : report.targetInsightEn}
          </p>
        </div>
      </div>

      {report.isEstimated ? (
        <p className="text-xs text-muted-foreground">
          {isKo
            ? `* 일부 지표는 실데이터+추정치 혼합입니다.${report.overallConfidence != null ? ` (종합 신뢰도 ${report.overallConfidence}%)` : ""}`
            : `* Metrics blend measured and estimated data.${report.overallConfidence != null ? ` (Overall confidence ${report.overallConfidence}%)` : ""}`}
        </p>
      ) : null}
    </div>
  );

  return (
    <section className="mt-12 border-t-2 border-border pt-12">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
        [ {isKo ? "매체 분석 보고서" : "Media analytics report"} ]
      </p>
      <h2 className="mt-2 text-xl font-black tracking-tight">
        {isKo ? "데이터 기반 매체 인사이트" : "Data-driven placement insights"}
      </h2>
      <ReportAccessGate
        access={access}
        feature="detail_data"
        isKo={isKo}
        className="mt-8"
      >
        {content}
      </ReportAccessGate>
    </section>
  );
}

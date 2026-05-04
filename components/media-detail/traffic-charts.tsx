"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import {
  buildInsights,
  resolveTrafficPattern,
  type StoredTrafficPattern,
} from "@/lib/media-traffic-estimate";

/** Brutalist 차트 색상 팔레트 — 다색 유지 + bx-* 톤. */
const CHART_PRIMARY = "#000000"; // bx-black
const CHART_ACCENT = "#FF6600"; // bx-accent (주황) — peak/강조
const CHART_NEUTRAL = "#737373"; // bx-gray-dim (주말)
const CHART_GRID = "rgba(0,0,0,0.12)";

type Tab = "hourly" | "weekly" | "monthly";

type Props = {
  mediaType: string;
  region: string;
  /** DB 저장된 traffic_pattern. 없으면 추정. */
  stored: StoredTrafficPattern | null;
  /** 절대값 환산용. 시간당/요일별/월별 평균 노출 = base × pattern[i] × N */
  dailyFootfall?: number | null;
  isKo: boolean;
};

const HOUR_TICKS = [0, 6, 12, 18, 23];
const WEEKDAY_LABELS_KO = ["월", "화", "수", "목", "금", "토", "일"];
const WEEKDAY_LABELS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_LABELS_KO = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
];

function peakIndex(arr: number[]): number {
  let idx = 0;
  for (let i = 1; i < arr.length; i++) if (arr[i] > arr[idx]) idx = i;
  return idx;
}

export function TrafficCharts({
  mediaType,
  region,
  stored,
  dailyFootfall,
  isKo,
}: Props) {
  const t = useTranslations("mediaDetail.traffic");
  const [tab, setTab] = useState<Tab>("hourly");

  const { pattern, isEstimated } = useMemo(
    () => resolveTrafficPattern(stored, mediaType, region),
    [stored, mediaType, region],
  );

  const insights = useMemo(
    () => buildInsights(pattern, isKo),
    [pattern, isKo],
  );

  const baseDaily = Math.max(1, dailyFootfall ?? 0);

  const hourlyData = useMemo(
    () =>
      pattern.hourly.map((p, h) => ({
        label: `${h}`,
        hour: h,
        value: Math.round(baseDaily * p),
      })),
    [pattern.hourly, baseDaily],
  );

  const weeklyData = useMemo(
    () =>
      pattern.weekly.map((p, i) => ({
        label: isKo ? WEEKDAY_LABELS_KO[i] : WEEKDAY_LABELS_EN[i],
        idx: i,
        value: Math.round(baseDaily * p * 7),
      })),
    [pattern.weekly, baseDaily, isKo],
  );

  const monthlyData = useMemo(
    () =>
      pattern.monthly.map((p, i) => ({
        label: MONTH_LABELS_KO[i],
        idx: i,
        value: Math.round(baseDaily * p * 30),
      })),
    [pattern.monthly, baseDaily],
  );

  const hourlyPeak = peakIndex(pattern.hourly);
  const weeklyPeak = peakIndex(pattern.weekly);

  return (
    <section className="border-2 border-border bg-card">
      <header className="flex flex-col gap-3 border-b-2 border-border px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="space-y-1">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
            [ TRAFFIC PATTERN ]
          </p>
          <h3 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
            {t("title")}
          </h3>
          <p className="font-mono text-[11px] tracking-tight text-muted-foreground">
            {t("desc")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isEstimated ? (
            <span className="border-2 border-accent bg-card px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
              {t("estimatedBadge")}
            </span>
          ) : null}
          <div role="tablist" className="inline-flex border-2 border-border bg-card">
            {(
              [
                ["hourly", t("tabHourly")],
                ["weekly", t("tabWeekly")],
                ["monthly", t("tabMonthly")],
              ] as const
            ).map(([k, label], i) => (
              <button
                key={k}
                role="tab"
                aria-selected={tab === k}
                type="button"
                onClick={() => setTab(k)}
                className={cn(
                  "px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors",
                  i > 0 && "border-l-2 border-border",
                  tab === k
                    ? "bg-hero-void text-hero-fg"
                    : "text-foreground hover:bg-muted",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>
      <div className="space-y-4 p-5 sm:p-6">
        <div
          role="tabpanel"
          className="h-56 w-full"
          aria-label={
            tab === "hourly"
              ? t("axisHourly")
              : tab === "weekly"
                ? t("axisWeekly")
                : t("axisMonthly")
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            {tab === "hourly" ? (
              <LineChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                <XAxis
                  dataKey="hour"
                  ticks={HOUR_TICKS}
                  tickFormatter={(h: number) => `${h}h`}
                  tick={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
                />
                <YAxis tick={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace" }} />
                <Tooltip
                  formatter={(v: number) => [v.toLocaleString(), t("axisHourly")]}
                  labelFormatter={(h) => `${h}:00`}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={CHART_ACCENT}
                  strokeWidth={2}
                  dot={(props) => {
                    const { cx, cy, index } = props as {
                      cx?: number;
                      cy?: number;
                      index?: number;
                    };
                    if (index !== hourlyPeak || cx == null || cy == null) {
                      return <g key={index ?? 0} />;
                    }
                    return (
                      <rect
                        key={index}
                        x={cx - 5}
                        y={cy - 5}
                        width={10}
                        height={10}
                        fill={CHART_ACCENT}
                        stroke={CHART_PRIMARY}
                        strokeWidth={2}
                      />
                    );
                  }}
                />
              </LineChart>
            ) : tab === "weekly" ? (
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace" }} />
                <YAxis tick={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace" }} />
                <Tooltip
                  formatter={(v: number) => [v.toLocaleString(), t("axisWeekly")]}
                />
                <Bar dataKey="value" radius={[0, 0, 0, 0]}>
                  {weeklyData.map((d, i) => (
                    <Cell
                      key={i}
                      fill={
                        i === weeklyPeak
                          ? CHART_ACCENT
                          : i >= 5
                            ? CHART_NEUTRAL
                            : CHART_PRIMARY
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace" }} />
                <YAxis tick={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace" }} />
                <Tooltip
                  formatter={(v: number) => [v.toLocaleString(), t("axisMonthly")]}
                  labelFormatter={(m) => `${m}${isKo ? "월" : ""}`}
                />
                <Bar dataKey="value" radius={[0, 0, 0, 0]} fill={CHART_PRIMARY} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        <ul className="grid gap-2 border-t-2 border-border pt-4 sm:grid-cols-3">
          <li className="font-mono text-[11px] tracking-tight">
            <span className="text-muted-foreground">{t("insightHour")}: </span>
            <span className="font-bold text-foreground">{insights.peakHourLabel}</span>
          </li>
          <li className="font-mono text-[11px] tracking-tight">
            <span className="text-muted-foreground">{t("insightWeekday")}: </span>
            <span className="font-bold text-foreground">{insights.peakWeekdayLabel}</span>
          </li>
          <li className="font-mono text-[11px] tracking-tight">
            <span className="text-muted-foreground">{t("insightMonth")}: </span>
            <span className="font-bold text-foreground">{insights.peakMonthLabel}</span>
          </li>
        </ul>
      </div>
    </section>
  );
}

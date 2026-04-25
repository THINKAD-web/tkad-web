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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  buildInsights,
  resolveTrafficPattern,
  type StoredTrafficPattern,
} from "@/lib/media-traffic-estimate";

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
    <Card className="border-navy/10 shadow-sm">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-navy">{t("title")}</CardTitle>
          <p className="text-xs text-muted-foreground">{t("desc")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isEstimated ? (
            <Badge
              variant="outline"
              className="border-amber-300/80 bg-amber-50 text-[10px] font-semibold text-amber-900"
            >
              {t("estimatedBadge")}
            </Badge>
          ) : null}
          <div role="tablist" className="flex rounded-full border border-navy/10 bg-slate-50 p-0.5">
            {(
              [
                ["hourly", t("tabHourly")],
                ["weekly", t("tabWeekly")],
                ["monthly", t("tabMonthly")],
              ] as const
            ).map(([k, label]) => (
              <Button
                key={k}
                role="tab"
                aria-selected={tab === k}
                type="button"
                size="sm"
                variant={tab === k ? "default" : "ghost"}
                className={cn(
                  "h-7 rounded-full px-3 text-[11px]",
                  tab === k && "btn-gold border-0",
                )}
                onClick={() => setTab(k)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
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
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
                <XAxis
                  dataKey="hour"
                  ticks={HOUR_TICKS}
                  tickFormatter={(h: number) => `${h}h`}
                  tick={{ fontSize: 11 }}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v: number) => [v.toLocaleString(), t("axisHourly")]}
                  labelFormatter={(h) => `${h}:00`}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--gold-dark, 38 38% 35%))"
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
                      <circle
                        key={index}
                        cx={cx}
                        cy={cy}
                        r={4}
                        fill="#d4af37"
                        stroke="#1a1f3a"
                        strokeWidth={1.5}
                      />
                    );
                  }}
                />
              </LineChart>
            ) : tab === "weekly" ? (
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v: number) => [v.toLocaleString(), t("axisWeekly")]}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {weeklyData.map((d, i) => (
                    <Cell
                      key={i}
                      fill={
                        i === weeklyPeak
                          ? "#d4af37"
                          : i >= 5
                            ? "#94a3b8"
                            : "#1a1f3a"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v: number) => [v.toLocaleString(), t("axisMonthly")]}
                  labelFormatter={(m) => `${m}${isKo ? "월" : ""}`}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="#1a1f3a" />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        <ul className="grid gap-1.5 text-xs text-navy/85 sm:grid-cols-3">
          <li>
            <span className="text-muted-foreground">{t("insightHour")}: </span>
            <span className="font-semibold">{insights.peakHourLabel}</span>
          </li>
          <li>
            <span className="text-muted-foreground">{t("insightWeekday")}: </span>
            <span className="font-semibold">{insights.peakWeekdayLabel}</span>
          </li>
          <li>
            <span className="text-muted-foreground">{t("insightMonth")}: </span>
            <span className="font-semibold">{insights.peakMonthLabel}</span>
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}

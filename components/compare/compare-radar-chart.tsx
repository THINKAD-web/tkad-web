"use client";

import { useMemo } from "react";
import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { MediaItem } from "@/lib/media-data";
import { buildCompareRadarData } from "@/lib/compare-quote";
import { cn } from "@/lib/utils";

const AXIS_LABELS_KO: Record<string, string> = {
  impressions: "노출수",
  cpmEfficiency: "CPM 효율",
  visibility: "가시성",
  accessibility: "접근성",
  availability: "가용률",
};

const AXIS_LABELS_EN: Record<string, string> = {
  impressions: "Reach",
  cpmEfficiency: "CPM eff.",
  visibility: "Visibility",
  accessibility: "Access",
  availability: "Availability",
};

const COLORS = ["#22d3ee", "#a855f7", "#ec4899", "#10b981", "#f59e0b", "#6366f1"];

type Props = {
  items: MediaItem[];
  isKo: boolean;
  className?: string;
};

export function CompareRadarChart({ items, isKo, className }: Props) {
  const radarRows = useMemo(() => buildCompareRadarData(items), [items]);

  const chartData = useMemo(() => {
    const keys = [
      "impressions",
      "cpmEfficiency",
      "visibility",
      "accessibility",
      "availability",
    ] as const;
    const labels = isKo ? AXIS_LABELS_KO : AXIS_LABELS_EN;
    return keys.map((key) => {
      const row: Record<string, string | number> = {
        axis: labels[key] ?? key,
        key,
      };
      for (const r of radarRows) {
        row[r.mediaId] = r[key];
      }
      return row;
    });
  }, [isKo, radarRows]);

  if (items.length < 2) return null;

  return (
    <section
      className={cn(
        "rounded-2xl border-2 border-border bg-card p-4 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:p-6",
        className,
      )}
    >
      <div className="mb-4">
        <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-accent">
          {`[ ${isKo ? "레이더" : "RADAR"} ]`}
        </p>
        <h2 className="mt-1 text-base font-bold tracking-tight text-foreground sm:text-lg">
          {isKo ? "5축 성과 비교" : "5-axis performance"}
        </h2>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {isKo
            ? "비교군 내 상대 점수(0–100). CPM 효율은 낮을수록 높은 점수입니다."
            : "Relative scores within this set (0–100). Lower CPM scores higher."}
        </p>
      </div>
      <div className="h-[min(22rem,52vw)] min-h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="72%">
            <PolarGrid stroke="rgba(148,163,184,0.35)" />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fill: "currentColor", fontSize: 10, fontWeight: 600 }}
              className="text-muted-foreground"
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: "rgba(148,163,184,0.65)", fontSize: 9 }}
              tickCount={4}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid rgba(148,163,184,0.35)",
                background: "rgba(15,23,42,0.92)",
                color: "#f8fafc",
                fontSize: 11,
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              formatter={(value) => {
                const row = radarRows.find((r) => r.mediaId === value);
                return row?.name ?? value;
              }}
            />
            {radarRows.map((r, idx) => (
              <Radar
                key={r.mediaId}
                name={r.mediaId}
                dataKey={r.mediaId}
                stroke={COLORS[idx % COLORS.length]}
                fill={COLORS[idx % COLORS.length]}
                fillOpacity={0.18}
                strokeWidth={2}
              />
            ))}
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

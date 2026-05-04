"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ScoredMedia } from "@/lib/ai-media-recommend";
import { estimatedMonthlyImpressions } from "@/lib/ai-recommend-metrics";

type Point = {
  x: number;
  y: number;
  z: number;
  name: string;
  id: string;
};

type Props = {
  locale: string;
  scored: readonly ScoredMedia[];
};

function ChartTooltip({
  active,
  payload,
  isKo,
}: {
  active?: boolean;
  payload?: { payload: Point }[];
  isKo: boolean;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="border-2 border-border bg-card px-3 py-2 text-xs">
      <p className="max-w-[220px] font-bold tracking-tight text-foreground">{p.name}</p>
      <p className="mt-1 font-mono text-[11px] tabular-nums text-muted-foreground">
        {isKo ? "추천 점수" : "Fit score"}: <span className="text-foreground">{p.x}</span>
      </p>
      <p className="font-mono text-[11px] tabular-nums text-muted-foreground">
        {isKo ? "월간 노출(추정)" : "Est. monthly reach"}:{" "}
        <span className="text-foreground">{p.y.toLocaleString()}</span>
      </p>
    </div>
  );
}

export default function MediaAiRecommendChart({ locale, scored }: Props) {
  const tr = useTranslations("recommend");
  const isKo = locale === "ko";

  const data = useMemo<Point[]>(() => {
    return scored.map((s) => ({
      x: s.score,
      y: estimatedMonthlyImpressions(s.item),
      z: 1,
      name: isKo ? s.item.name : (s.item.nameEn || s.item.name),
      id: s.item.id,
    }));
  }, [scored, isKo]);

  const hasReach = data.some((d) => d.y > 0);

  if (!data.length || !hasReach) {
    return (
      <div
        className="flex min-h-[280px] items-center justify-center border-2 border-border bg-muted px-4 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
        role="img"
        aria-label={tr("resultChartAria")}
      >
        {`// `}{tr("resultChartEmpty")}
      </div>
    );
  }

  return (
    <div
      className="h-[min(360px,55vw)] w-full border-2 border-border bg-card p-3 sm:p-4"
      role="img"
      aria-label={tr("resultChartAria")}
    >
      <p className="mb-2 px-1 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
        [ {isKo ? "오른쪽: 추천 점수 ↑ · 위: 월간 노출(추정) ↑" : "Right: fit ↑ · Up: est. monthly reach ↑"} ]
      </p>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            type="number"
            dataKey="x"
            name="fit"
            domain={[0, 100]}
            tick={{
              fill: "var(--foreground)",
              fontSize: 11,
              fontFamily: "JetBrains Mono, monospace",
            }}
            stroke="var(--border)"
            label={{
              value: isKo ? "추천 점수 (0–100)" : "Fit score (0–100)",
              position: "bottom",
              fill: "var(--foreground)",
              fontSize: 11,
              fontFamily: "JetBrains Mono, monospace",
            }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="reach"
            tick={{
              fill: "var(--foreground)",
              fontSize: 11,
              fontFamily: "JetBrains Mono, monospace",
            }}
            stroke="var(--border)"
            tickFormatter={(v) =>
              v >= 1_000_000
                ? `${(v / 1_000_000).toFixed(1)}M`
                : `${Math.round(v / 1000)}k`
            }
            width={48}
            label={{
              value: isKo ? "월간 노출(추정)" : "Est. monthly reach",
              angle: -90,
              position: "insideLeft",
              fill: "var(--foreground)",
              fontSize: 11,
              fontFamily: "JetBrains Mono, monospace",
            }}
          />
          <Tooltip
            cursor={{ strokeDasharray: "3 3", stroke: "var(--hermes)" }}
            content={<ChartTooltip isKo={isKo} />}
          />
          <Scatter data={data} fill="var(--hermes)" fillOpacity={0.88} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

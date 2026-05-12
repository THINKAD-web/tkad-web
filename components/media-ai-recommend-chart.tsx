"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  CartesianGrid,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
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
  rank: number;
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
    <div className="rounded-2xl border border-border/80 bg-card/90 px-3 py-2 text-xs shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur">
      <p className="max-w-[220px] font-bold tracking-tight text-foreground">{p.name}</p>
      <p className="mt-1 font-mono text-[11px] tabular-nums text-muted-foreground">
        {isKo ? "추천 점수" : "Fit score"}: <span className="text-foreground">{p.x}</span>
      </p>
      <p className="font-mono text-[11px] tabular-nums text-muted-foreground">
        {isKo ? "월간 노출(추정)" : "Est. monthly reach"}:{" "}
        <span className="text-foreground">{p.y.toLocaleString()}</span>
      </p>
      {p.rank <= 3 ? (
        <p className="mt-1 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
          [ TOP {p.rank} ]
        </p>
      ) : null}
    </div>
  );
}

function quantile(sortedAsc: number[], q: number) {
  if (sortedAsc.length === 0) return 0;
  const pos = (sortedAsc.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const v0 = sortedAsc[base] ?? 0;
  const v1 = sortedAsc[base + 1] ?? v0;
  return v0 + (v1 - v0) * rest;
}

export default function MediaAiRecommendChart({ locale, scored }: Props) {
  const tr = useTranslations("recommend");
  const isKo = locale === "ko";

  const data = useMemo<Point[]>(() => {
    const sorted = [...scored].sort((a, b) => b.score - a.score);
    const rankById = new Map<string, number>();
    for (let i = 0; i < sorted.length; i++) {
      rankById.set(sorted[i].item.id, i + 1);
    }
    return scored.map((s) => {
      const rank = rankById.get(s.item.id) ?? 999;
      return {
        x: s.score,
        y: estimatedMonthlyImpressions(s.item),
        z: rank <= 3 ? 2 : 1,
        name: isKo ? s.item.name : (s.item.nameEn || s.item.name),
        id: s.item.id,
        rank,
      };
    });
  }, [scored, isKo]);

  const hasReach = data.some((d) => d.y > 0);
  const reachSorted = useMemo(() => {
    return data
      .map((d) => d.y)
      .filter((v) => Number.isFinite(v) && v > 0)
      .sort((a, b) => a - b);
  }, [data]);
  const reachP75 = useMemo(() => quantile(reachSorted, 0.75), [reachSorted]);
  const fitGood = 70;

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

  const top3 = data.filter((d) => d.rank <= 3);
  const others = data.filter((d) => d.rank > 3);

  return (
    <div
      className="w-full overflow-hidden rounded-[26px] border border-border/80 bg-card/80 p-3 shadow-[0_28px_100px_rgba(0,0,0,0.18)] backdrop-blur sm:p-4"
      role="img"
      aria-label={tr("resultChartAria")}
    >
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2 px-1">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            [ {isKo ? "추천 차트" : "RECOMMENDATION CHART"} ]
          </p>
          <p className="mt-1 text-sm font-bold tracking-tight text-foreground">
            {isKo ? "오른쪽 위가 ‘좋은 후보’" : "Top-right = stronger candidates"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/80 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground shadow-xs backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-[var(--hermes)] opacity-80" />
            {isKo ? "후보" : "Candidates"}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/80 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground shadow-xs backdrop-blur">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--hermes)] shadow-[0_0_0_2px_rgba(236,72,153,0.22),0_0_24px_rgba(236,72,153,0.32)]" />
            TOP 3
          </span>
        </div>
      </div>

      <div className="h-[min(440px,64vw)] w-full">
        <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 10, bottom: 34, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <ReferenceArea
            x1={fitGood}
            x2={100}
            y1={reachP75}
            y2="dataMax"
            fill="rgba(34,211,238,0.10)"
            stroke="rgba(34,211,238,0.18)"
          />
          <ReferenceLine
            x={fitGood}
            stroke="rgba(99,102,241,0.35)"
            strokeDasharray="6 6"
          />
          <ReferenceLine
            y={reachP75}
            stroke="rgba(168,85,247,0.30)"
            strokeDasharray="6 6"
          />
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
              value: isKo ? "추천 점수 (오른쪽일수록 좋음)" : "Fit score (better → right)",
              position: "bottom",
              offset: 18,
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
              value: isKo ? "월간 노출(추정) (위일수록 큼)" : "Est. monthly reach (better ↑)",
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
          <Scatter data={others} fill="var(--hermes)" fillOpacity={0.55} />
          <Scatter
            data={top3}
            fill="var(--hermes)"
            fillOpacity={0.95}
            stroke="rgba(255,255,255,0.35)"
            strokeWidth={1}
          />
        </ScatterChart>
      </ResponsiveContainer>
      </div>

      <p className="mt-2 px-1 text-xs leading-relaxed text-muted-foreground">
        {isKo
          ? "읽는 법: 오른쪽(추천 점수↑) + 위(월간 노출↑)로 갈수록 우선 검토 후보입니다. TOP 3는 크게 표시했어요."
          : "How to read: candidates toward the top-right are generally stronger. TOP 3 are highlighted."}
      </p>
    </div>
  );
}

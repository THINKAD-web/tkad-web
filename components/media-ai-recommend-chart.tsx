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
  ZAxis,
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
    <div className="border-2 border-bx-black bg-bx-white px-3 py-2 text-xs">
      <p className="max-w-[220px] font-bold tracking-tight text-bx-black">{p.name}</p>
      <p className="mt-1 font-mono text-[11px] tabular-nums text-bx-gray-dim">
        {isKo ? "적합도" : "Fit"}: <span className="text-bx-black">{p.x}</span>
      </p>
      <p className="font-mono text-[11px] tabular-nums text-bx-gray-dim">
        {isKo ? "월 추정 노출" : "Est. monthly reach"}:{" "}
        <span className="text-bx-black">{p.y.toLocaleString()}</span>
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
      z: s.score,
      name: isKo ? s.item.name : (s.item.nameEn || s.item.name),
      id: s.item.id,
    }));
  }, [scored, isKo]);

  const hasReach = data.some((d) => d.y > 0);

  if (!data.length || !hasReach) {
    return (
      <div
        className="flex min-h-[280px] items-center justify-center border-2 border-bx-black bg-bx-off px-4 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-bx-gray-dim"
        role="img"
        aria-label={tr("resultChartAria")}
      >
        {`// `}{tr("resultChartEmpty")}
      </div>
    );
  }

  return (
    <div
      className="h-[min(360px,55vw)] w-full border-2 border-bx-black bg-bx-white p-3 sm:p-4"
      role="img"
      aria-label={tr("resultChartAria")}
    >
      <p className="mb-2 px-1 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
        [ {tr("resultChartHint")} ]
      </p>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.12)" />
          <XAxis
            type="number"
            dataKey="x"
            name="fit"
            domain={[0, 100]}
            tick={{ fill: "#000000", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
            stroke="#000000"
            label={{
              value: isKo ? "AI 적합도" : "AI fit (0–100)",
              position: "bottom",
              fill: "#000000",
              fontSize: 11,
              fontFamily: "JetBrains Mono, monospace",
            }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="reach"
            tick={{ fill: "#000000", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
            stroke="#000000"
            tickFormatter={(v) =>
              v >= 1_000_000
                ? `${(v / 1_000_000).toFixed(1)}M`
                : `${Math.round(v / 1000)}k`
            }
            width={48}
            label={{
              value: isKo ? "월 추정 노출" : "Est. monthly reach",
              angle: -90,
              position: "insideLeft",
              fill: "#000000",
              fontSize: 11,
              fontFamily: "JetBrains Mono, monospace",
            }}
          />
          <ZAxis type="number" dataKey="z" range={[40, 400]} />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            content={<ChartTooltip isKo={isKo} />}
          />
          <Scatter data={data} fill="#FF6600" fillOpacity={0.9} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

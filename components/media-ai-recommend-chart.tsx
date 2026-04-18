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
    <div className="rounded-lg border border-navy/15 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="max-w-[220px] font-semibold text-navy">{p.name}</p>
      <p className="mt-1 tabular-nums text-navy/70">
        {isKo ? "적합도" : "Fit"}: {p.x}
      </p>
      <p className="tabular-nums text-navy/70">
        {isKo ? "월 추정 노출" : "Est. monthly reach"}:{" "}
        {p.y.toLocaleString()}
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
      name: isKo ? s.item.name : s.item.nameEn,
      id: s.item.id,
    }));
  }, [scored, isKo]);

  const hasReach = data.some((d) => d.y > 0);

  if (!data.length || !hasReach) {
    return (
      <div
        className="flex min-h-[280px] items-center justify-center rounded-2xl border border-navy/10 bg-slate-50 px-4 text-center text-sm text-slate-500"
        role="img"
        aria-label={tr("resultChartAria")}
      >
        {tr("resultChartEmpty")}
      </div>
    );
  }

  return (
    <div
      className="h-[min(360px,55vw)] w-full rounded-2xl border border-navy/10 bg-slate-50 p-2 sm:p-4"
      role="img"
      aria-label={tr("resultChartAria")}
    >
      <p className="mb-2 px-1 text-[11px] text-slate-500">{tr("resultChartHint")}</p>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(13,27,46,0.1)" />
          <XAxis
            type="number"
            dataKey="x"
            name="fit"
            domain={[0, 100]}
            tick={{ fill: "#0d1b2e", fontSize: 11 }}
            stroke="rgba(13,27,46,0.3)"
            label={{
              value: isKo ? "AI 적합도" : "AI fit (0–100)",
              position: "bottom",
              fill: "#0d1b2e",
              fontSize: 11,
            }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="reach"
            tick={{ fill: "#0d1b2e", fontSize: 11 }}
            stroke="rgba(13,27,46,0.3)"
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
              fill: "#0d1b2e",
              fontSize: 11,
            }}
          />
          <ZAxis type="number" dataKey="z" range={[40, 400]} />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            content={<ChartTooltip isKo={isKo} />}
          />
          <Scatter data={data} fill="#c9a227" fillOpacity={0.85} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

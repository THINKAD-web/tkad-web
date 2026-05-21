"use client";

import { useMemo } from "react";
import { useLocale } from "next-intl";
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
import { formatCaseStudyMetricValue } from "@/lib/campaign-case-study";
import type { CaseStudyMetric } from "@/lib/campaign-case-study";

const BAR_COLORS = ["#a855f7", "#22d3ee", "#ec4899", "#7c3aed", "#0ea5e9"];

type Props = {
  metrics: CaseStudyMetric[];
};

function parseNumericValue(raw: string): number {
  const cleaned = raw.replace(/[₩%,+\s]/g, "");
  const m = cleaned.match(/([\d.]+)\s*(만|억|M|K)?/i);
  if (!m) return 0;
  let n = Number(m[1]);
  if (!Number.isFinite(n)) return 0;
  const unit = (m[2] ?? "").toLowerCase();
  if (unit === "만") n *= 10_000;
  if (unit === "억") n *= 100_000_000;
  if (unit === "m") n *= 1_000_000;
  if (unit === "k") n *= 1_000;
  return n;
}

export function CaseMetricsCharts({ metrics }: Props) {
  const locale = useLocale();
  const isKo = locale === "ko";

  const chartData = useMemo(() => {
    return metrics.slice(0, 6).map((m, i) => ({
      name: isKo ? m.labelKo : m.labelEn,
      display: formatCaseStudyMetricValue(m, locale),
      value: parseNumericValue(
        isKo ? m.valueKo : m.valueEn ?? m.valueKo,
      ),
      fill: BAR_COLORS[i % BAR_COLORS.length],
    }));
  }, [metrics, isKo, locale]);

  const hasNumeric = chartData.some((d) => d.value > 0);

  if (metrics.length === 0) return null;

  return (
    <div className="mt-6 h-64 w-full sm:h-72">
      {hasNumeric ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: "rgba(255,255,255,0.5)" }}
              interval={0}
              angle={-12}
              textAnchor="end"
              height={48}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "rgba(255,255,255,0.45)" }}
              tickFormatter={(v) =>
                Number(v).toLocaleString(isKo ? "ko-KR" : "en-US", {
                  notation: "compact",
                })
              }
            />
            <Tooltip
              contentStyle={{
                background: "#0a0a0f",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 12,
                fontSize: 11,
              }}
              formatter={(_v: number, _n: string, item) => [
                (item?.payload as { display?: string })?.display ?? "",
                isKo ? "성과" : "Result",
              ]}
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {metrics.map((m, i) => (
            <div
              key={m.key}
              className="rounded-[16px] border dark:border-white/12 border-gray-200 dark:bg-white/5 bg-gray-50 p-4"
              style={{
                boxShadow: `0 0 24px ${BAR_COLORS[i % BAR_COLORS.length]}22`,
              }}
            >
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] dark:text-white text-gray-500">
                {isKo ? m.labelKo : m.labelEn}
              </p>
              <p className="mt-2 text-xl font-black tabular-nums dark:text-white text-gray-900">
                {formatCaseStudyMetricValue(m, locale)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

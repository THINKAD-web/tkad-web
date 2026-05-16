"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Point = { date: string; impressions: number };

type Props = {
  data: Point[];
  isKo: boolean;
};

export function AdvertiserImpressionsChart({ data, isKo }: Props) {
  if (data.length < 2) {
    return (
      <p className="rounded-[16px] border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        {isKo
          ? "집행 기간이 확정되면 일별 노출 추이가 표시됩니다."
          : "Daily impressions appear once the flight period is set."}
      </p>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    label: d.date.slice(5),
  }));

  return (
    <div className="h-56 w-full rounded-[16px] border border-border bg-card p-3 sm:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10 }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10 }}
            tickFormatter={(v) =>
              Number(v).toLocaleString(isKo ? "ko-KR" : "en-US", {
                notation: "compact",
              })
            }
          />
          <Tooltip
            formatter={(value: number) => [
              value.toLocaleString(isKo ? "ko-KR" : "en-US"),
              isKo ? "노출(추정)" : "Impressions (est.)",
            ]}
            labelFormatter={(label) => label}
          />
          <Line
            type="monotone"
            dataKey="impressions"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

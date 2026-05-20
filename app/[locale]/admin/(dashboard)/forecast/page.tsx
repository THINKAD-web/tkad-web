"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PIPELINE_STAGE_LABEL } from "@/lib/crm-pipeline";
import type { SalesPipelineStage } from "@prisma/client";

type ForecastPayload = {
  forecast: {
    monthWeighted: number;
    accountCount: number;
    byStage: Record<
      SalesPipelineStage,
      { count: number; rawTotal: number; weighted: number }
    >;
  };
  quarterly: { quarter: string; amountKrw: number }[];
  probabilities: Record<SalesPipelineStage, number>;
};

export default function AdminForecastPage() {
  const [data, setData] = useState<ForecastPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/crm/forecast");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "fail");
      setData(json);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (err) {
    return <p className="p-6 text-destructive text-sm">{err}</p>;
  }
  if (!data) {
    return <p className="p-6 text-muted-foreground text-sm">로딩…</p>;
  }

  const { forecast, quarterly, probabilities } = data;
  const stageRows = (
    Object.keys(forecast.byStage) as SalesPipelineStage[]
  ).filter((s) => s !== "completed");

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">매출 예측</h1>
        <p className="text-muted-foreground text-sm">
          파이프라인 단계별 확률을 적용한 가중 예상 매출입니다.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">이번 달 예상 매출 (가중)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold tabular-nums">
            {forecast.monthWeighted.toLocaleString("ko-KR")}원
          </p>
          <p className="text-muted-foreground text-xs">
            활성 기회 {forecast.accountCount}건 · 완료 단계 제외
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">단계별 기회</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-4">단계</th>
                <th className="py-2 pr-4">확률</th>
                <th className="py-2 pr-4">건수</th>
                <th className="py-2 pr-4">예상 합계</th>
                <th className="py-2">가중 합계</th>
              </tr>
            </thead>
            <tbody>
              {stageRows.map((stage) => {
                const row = forecast.byStage[stage];
                if (!row.count) return null;
                return (
                  <tr key={stage} className="border-b border-border/60">
                    <td className="py-2 pr-4">
                      {PIPELINE_STAGE_LABEL[stage].ko}
                    </td>
                    <td className="py-2 pr-4">
                      {Math.round((probabilities[stage] ?? 0) * 100)}%
                    </td>
                    <td className="py-2 pr-4">{row.count}</td>
                    <td className="py-2 pr-4 tabular-nums">
                      {row.rawTotal.toLocaleString("ko-KR")}
                    </td>
                    <td className="py-2 tabular-nums">
                      {row.weighted.toLocaleString("ko-KR")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">분기별 실제 매출 (결제 완료)</CardTitle>
        </CardHeader>
        <CardContent className="h-[320px]">
          {quarterly.length === 0 ? (
            <p className="text-sm text-muted-foreground">데이터 없음</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={quarterly}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="quarter" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) =>
                    v >= 100_000_000
                      ? `${(v / 100_000_000).toFixed(0)}억`
                      : `${Math.round(v / 10_000)}만`
                  }
                />
                <Tooltip
                  formatter={(v: number) => [
                    `${v.toLocaleString("ko-KR")}원`,
                    "매출",
                  ]}
                />
                <Bar dataKey="amountKrw" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

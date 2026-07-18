"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Stats = {
  totalRequests: number;
  converted: number;
  conversionRate: number;
  topMedia: { mediaId: string; count: number }[];
  recentLogs: {
    id: string;
    source: string;
    convertedToInquiry: boolean;
    selectedMediaIds: string[];
    createdAt: string;
  }[];
};

export default function AdminRecommendationsPage() {
  const [data, setData] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/recommendations");
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "불러오기 실패");
        return;
      }
      setData(json as Stats);
    } catch {
      setError("네트워크 오류");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Sparkles className="h-6 w-6 text-[color:var(--qp-accent)]" />
            AI 추천 모니터링
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            최근 30일 · /recommend · /planner 추천 요청 로그
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          새로고침
        </button>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {loading && !data ? (
        <p className="text-sm text-muted-foreground">로딩 중…</p>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>추천 요청</CardDescription>
                <CardTitle className="text-3xl tabular-nums">
                  {data.totalRequests.toLocaleString()}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>문의 전환</CardDescription>
                <CardTitle className="text-3xl tabular-nums">
                  {data.converted.toLocaleString()}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>전환율</CardDescription>
                <CardTitle className="text-3xl tabular-nums">
                  {data.conversionRate}%
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">가장 많이 추천된 매체 Top 10</CardTitle>
            </CardHeader>
            <CardContent>
              {data.topMedia.length === 0 ? (
                <p className="text-sm text-muted-foreground">데이터 없음</p>
              ) : (
                <ul className="space-y-2">
                  {data.topMedia.map((m, i) => (
                    <li
                      key={m.mediaId}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                    >
                      <span>
                        #{i + 1}{" "}
                        <code className="text-xs">{m.mediaId}</code>
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {m.count}회
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">최근 요청</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="py-2 pr-4">시각</th>
                    <th className="py-2 pr-4">소스</th>
                    <th className="py-2 pr-4">선택</th>
                    <th className="py-2">전환</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentLogs.map((log) => (
                    <tr key={log.id} className="border-b border-border/60">
                      <td className="py-2 pr-4 tabular-nums text-xs">
                        {new Date(log.createdAt).toLocaleString("ko-KR")}
                      </td>
                      <td className="py-2 pr-4">{log.source}</td>
                      <td className="py-2 pr-4 tabular-nums">
                        {log.selectedMediaIds.length}
                      </td>
                      <td className="py-2">
                        {log.convertedToInquiry ? "✓" : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

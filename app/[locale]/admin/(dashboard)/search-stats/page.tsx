"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Search } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Stats = {
  days: number;
  totalSearches: number;
  topQueries: {
    query: string;
    count: number;
    zeroCount: number;
    lastResultCount: number;
  }[];
  zeroResultQueries: { query: string; count: number }[];
};

export default function AdminSearchStatsPage() {
  const [data, setData] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/search-stats");
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
          <h1 className="text-2xl font-bold tracking-tight">검색 통계</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            최근 30일 통합 검색 로그 · 무결과 검색어는 매체 등록 힌트로 활용
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

      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : null}

      {loading && !data ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : null}

      {data ? (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center gap-3">
              <Search className="h-5 w-5 text-accent" />
              <div>
                <CardTitle>요약</CardTitle>
                <CardDescription>최근 {data.days}일</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-3xl font-bold tabular-nums">
                {data.totalSearches.toLocaleString("ko-KR")}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">총 검색 수</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>인기 검색어 Top 10</CardTitle>
            </CardHeader>
            <CardContent>
              {data.topQueries.length === 0 ? (
                <p className="text-sm text-muted-foreground">데이터 없음</p>
              ) : (
                <ol className="space-y-2">
                  {data.topQueries.map((row, i) => (
                    <li
                      key={row.query}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm"
                    >
                      <span>
                        <span className="mr-2 font-mono text-muted-foreground">
                          {i + 1}.
                        </span>
                        <span className="font-semibold">{row.query}</span>
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {row.count}회 · 최근 결과 {row.lastResultCount}건
                        {row.zeroCount > 0
                          ? ` · 무결과 ${row.zeroCount}회`
                          : ""}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>결과 없는 검색어</CardTitle>
              <CardDescription>
                신규 매체·콘텐츠 등록 또는 동의어 태그 보강 검토
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.zeroResultQueries.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  무결과 검색 없음
                </p>
              ) : (
                <ul className="space-y-2">
                  {data.zeroResultQueries.map((row) => (
                    <li
                      key={row.query}
                      className="flex justify-between gap-2 rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-sm"
                    >
                      <span className="font-semibold">{row.query}</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {row.count}회
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

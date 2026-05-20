"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, KeyRound, Loader2, RefreshCw } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type UsageData = {
  days: number;
  totalRequests: number;
  anomalyAlert: string | null;
  keys: {
    id: string;
    name: string;
    maskedKey: string;
    plan: string;
    monthlyUsage: number;
    monthlyLimit: number | null;
    isActive: boolean;
    lastUsedAt: string | null;
    user: { email: string; name: string; company: string | null };
  }[];
  byEndpoint: { endpoint: string; count: number; errors: number }[];
  anomalies: {
    apiKeyId: string;
    keyName: string;
    maskedKey: string;
    userEmail: string;
    minute: string;
    requestsPerMinute: number;
    threshold: number;
  }[];
};

export default function AdminApiUsagePage() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/api-usage");
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "불러오기 실패");
        return;
      }
      setData(json as UsageData);
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
            <KeyRound className="h-7 w-7" />
            API 사용량
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            B2B 공개 API 키 · 엔드포인트별 호출 · 이상 트래픽 (분당 100회 초과)
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

      {data?.anomalyAlert ? (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{data.anomalyAlert}</p>
        </div>
      ) : null}

      {loading && !data ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : null}

      {data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>최근 {data.days}일 총 호출</CardDescription>
                <CardTitle className="text-3xl tabular-nums">
                  {data.totalRequests.toLocaleString()}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>활성 API 키</CardDescription>
                <CardTitle className="text-3xl tabular-nums">
                  {data.keys.filter((k) => k.isActive).length}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>엔드포인트별 통계</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {data.byEndpoint.length === 0 ? (
                  <li className="text-muted-foreground">데이터 없음</li>
                ) : (
                  data.byEndpoint.map((row) => (
                    <li
                      key={row.endpoint}
                      className="flex flex-wrap justify-between gap-2 border-b border-border/60 py-2 last:border-0"
                    >
                      <span className="font-mono text-xs">{row.endpoint}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {row.count.toLocaleString()}회
                        {row.errors > 0 ? ` · 오류 ${row.errors}` : ""}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </CardContent>
          </Card>

          {data.anomalies.length > 0 ? (
            <Card className="border-amber-500/30">
              <CardHeader>
                <CardTitle>이상 트래픽</CardTitle>
                <CardDescription>분당 100회 초과 구간</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  {data.anomalies.map((a) => (
                    <li
                      key={`${a.apiKeyId}-${a.minute}`}
                      className="rounded-lg border border-border/80 p-3"
                    >
                      <p className="font-medium">
                        {a.keyName} · {a.maskedKey}
                      </p>
                      <p className="text-muted-foreground">{a.userEmail}</p>
                      <p className="mt-1 font-mono text-xs">
                        {a.minute} — {a.requestsPerMinute} req/min (한도{" "}
                        {a.threshold})
                      </p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>API 키 목록</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="py-2 pr-4">이름</th>
                    <th className="py-2 pr-4">키</th>
                    <th className="py-2 pr-4">사용자</th>
                    <th className="py-2 pr-4">플랜</th>
                    <th className="py-2 pr-4">이번 달</th>
                    <th className="py-2">마지막 사용</th>
                  </tr>
                </thead>
                <tbody>
                  {data.keys.map((k) => (
                    <tr key={k.id} className="border-b border-border/50">
                      <td className="py-2 pr-4 font-medium">{k.name}</td>
                      <td className="py-2 pr-4 font-mono text-xs">
                        {k.maskedKey}
                      </td>
                      <td className="py-2 pr-4 text-xs">
                        {k.user.email}
                        {k.user.company ? (
                          <span className="block text-muted-foreground">
                            {k.user.company}
                          </span>
                        ) : null}
                      </td>
                      <td className="py-2 pr-4">{k.plan}</td>
                      <td className="py-2 pr-4 tabular-nums">
                        {k.monthlyUsage}
                        {k.monthlyLimit != null ? ` / ${k.monthlyLimit}` : ""}
                      </td>
                      <td className="py-2 text-xs text-muted-foreground">
                        {k.lastUsedAt
                          ? new Date(k.lastUsedAt).toLocaleString("ko-KR")
                          : "—"}
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

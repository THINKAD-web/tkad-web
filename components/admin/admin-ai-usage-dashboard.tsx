"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

type FeatureRow = {
  feature: string;
  featureLabel: string;
  models: string[];
  calls: number;
  tokens: number;
  estCostUsd: number;
};
type ModelRow = {
  model: string;
  modelLabel: string;
  calls: number;
  tokens: number;
  estCostUsd: number;
};
type Resp = {
  configured: boolean;
  totals: { tokens: number; calls: number; estCostUsd: number } | null;
  byFeature: FeatureRow[];
  byModel: ModelRow[];
};

type Period = "today" | "7d" | "30d" | "all";
const PERIODS: { key: Period; label: string }[] = [
  { key: "today", label: "오늘" },
  { key: "7d", label: "7일" },
  { key: "30d", label: "30일" },
  { key: "all", label: "전체" },
];

const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const num = (n: number) => n.toLocaleString("ko-KR");

function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-black tabular-nums text-violet-600 dark:text-violet-300">{value}</p>
      {sub ? <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

export function AdminAiUsageDashboard() {
  const [period, setPeriod] = useState<Period>("30d");
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/ai-usage?period=${period}`, { cache: "no-store" });
      setData((await res.json()) as Resp);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = data?.totals;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-xl border border-gray-200 p-0.5 dark:border-white/10">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              className={
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors " +
                (period === p.key
                  ? "bg-violet-600 text-white"
                  : "text-muted-foreground hover:bg-gray-50 dark:hover:bg-white/5")
              }
            >
              {p.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 px-3 text-xs font-semibold dark:border-white/10"
        >
          <RefreshCw className={"h-3.5 w-3.5 " + (loading ? "animate-spin" : "")} />
          새로고침
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card label="추정 비용" value={usd(totals?.estCostUsd ?? 0)} sub="USD · 추정" />
        <Card label="총 토큰" value={num(totals?.tokens ?? 0)} />
        <Card label="총 호출" value={num(totals?.calls ?? 0)} />
      </div>

      {loading && !data ? (
        <div className="py-10 text-center text-muted-foreground">
          <Loader2 className="mx-auto h-5 w-5 animate-spin" />
        </div>
      ) : data && data.configured === false ? (
        <p className="py-10 text-center text-sm text-muted-foreground">DB 미설정</p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {/* 기능별 */}
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10">
            <div className="border-b border-gray-100 px-4 py-3 text-sm font-bold dark:border-white/10">
              기능별
            </div>
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs uppercase text-muted-foreground dark:border-white/10 dark:bg-white/5">
                  <th className="p-3">기능</th>
                  <th className="p-3 text-right">호출</th>
                  <th className="p-3 text-right">토큰</th>
                  <th className="p-3 text-right">추정 비용</th>
                </tr>
              </thead>
              <tbody>
                {(data?.byFeature ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground">
                      데이터 없음
                    </td>
                  </tr>
                ) : (
                  data!.byFeature.map((f) => (
                    <tr key={f.feature} className="border-b dark:border-white/5">
                      <td className="p-3">
                        <p className="font-semibold">{f.featureLabel}</p>
                        <p className="text-[11px] text-muted-foreground">{f.models.join(", ")}</p>
                      </td>
                      <td className="p-3 text-right tabular-nums">{num(f.calls)}</td>
                      <td className="p-3 text-right tabular-nums">{num(f.tokens)}</td>
                      <td className="p-3 text-right font-semibold tabular-nums text-violet-600 dark:text-violet-300">
                        {usd(f.estCostUsd)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 모델별 */}
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10">
            <div className="border-b border-gray-100 px-4 py-3 text-sm font-bold dark:border-white/10">
              모델별
            </div>
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs uppercase text-muted-foreground dark:border-white/10 dark:bg-white/5">
                  <th className="p-3">모델</th>
                  <th className="p-3 text-right">호출</th>
                  <th className="p-3 text-right">토큰</th>
                  <th className="p-3 text-right">추정 비용</th>
                </tr>
              </thead>
              <tbody>
                {(data?.byModel ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground">
                      데이터 없음
                    </td>
                  </tr>
                ) : (
                  data!.byModel.map((m) => (
                    <tr key={m.model} className="border-b dark:border-white/5">
                      <td className="p-3">
                        <p className="font-semibold">{m.modelLabel}</p>
                        <p className="text-[11px] text-muted-foreground">{m.model}</p>
                      </td>
                      <td className="p-3 text-right tabular-nums">{num(m.calls)}</td>
                      <td className="p-3 text-right tabular-nums">{num(m.tokens)}</td>
                      <td className="p-3 text-right font-semibold tabular-nums text-violet-600 dark:text-violet-300">
                        {usd(m.estCostUsd)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        ※ 비용은 모델별 블렌디드 단가(입력+출력 평균) 기반 추정치이며 실제 청구액과 다를 수 있습니다.
        토큰 미기록 호출(로깅 추가 이전)은 집계에서 0으로 표시됩니다.
      </p>
    </div>
  );
}

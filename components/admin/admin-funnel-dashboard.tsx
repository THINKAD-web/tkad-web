"use client";

import type { AdvertiserFunnelStats } from "@/lib/funnel-analytics";

function pct(num: number, den: number): string {
  if (den <= 0) return "0%";
  return `${Math.round((num / den) * 1000) / 10}%`;
}

export function AdminFunnelDashboard({
  stats,
}: {
  stats: AdvertiserFunnelStats | null;
}) {
  if (!stats) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        DB가 연결되지 않았거나 VisitorJourney 테이블이 없습니다.{" "}
        <code className="text-xs">npx prisma db push</code> 후 다시 확인하세요.
      </p>
    );
  }

  const j = stats.journeys;
  const stages = [
    { label: "첫 방문 (세션)", count: j, rate: "100%" },
    { label: "예산 미리보기", count: stats.withBudgetPreview, rate: pct(stats.withBudgetPreview, j) },
    { label: "빠른 견적", count: stats.withQuickQuote, rate: pct(stats.withQuickQuote, j) },
    { label: "가이드 다운로드", count: stats.withGuideDownload, rate: pct(stats.withGuideDownload, j) },
    { label: "견적 요청", count: stats.withQuoteRequest, rate: pct(stats.withQuoteRequest, j) },
    { label: "가입", count: stats.withSignup, rate: pct(stats.withSignup, j) },
  ];

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stages.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border bg-card p-4 shadow-sm"
          >
            <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{s.count.toLocaleString("ko-KR")}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{s.rate}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-4">
          <h2 className="tkad-type-title">UTM 소스 (상위)</h2>
          <ul className="mt-3 space-y-2">
            {stats.byUtmSource.length === 0 ? (
              <li className="text-sm text-muted-foreground">데이터 없음</li>
            ) : (
              stats.byUtmSource.map((row) => (
                <li
                  key={row.source}
                  className="flex justify-between text-sm"
                >
                  <span>{row.source}</span>
                  <span className="tabular-nums font-semibold">{row.count}</span>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="rounded-xl border bg-card p-4">
          <h2 className="tkad-type-title">이벤트 스텝</h2>
          <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
            {stats.stepCounts.map((row) => (
              <li key={row.step} className="flex justify-between text-sm">
                <span className="text-xs">{row.step}</span>
                <span className="tabular-nums font-semibold">{row.count}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {stats.daily.length > 0 ? (
        <section className="rounded-xl border bg-card p-4">
          <h2 className="tkad-type-title">일별 세션 · 견적</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="py-2 pr-4">날짜</th>
                  <th className="py-2 pr-4">세션</th>
                  <th className="py-2">견적 관련</th>
                </tr>
              </thead>
              <tbody>
                {stats.daily.map((d) => (
                  <tr key={d.date} className="border-b border-border/50">
                    <td className="py-2 text-xs">{d.date}</td>
                    <td className="py-2 tabular-nums">{d.journeys}</td>
                    <td className="py-2 tabular-nums">{d.quotes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}

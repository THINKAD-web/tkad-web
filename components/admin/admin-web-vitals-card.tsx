import type { WebVitalsDashboardSummary } from "@/lib/web-vitals-summary";

function formatMetric(name: string, p75: number): string {
  if (name === "CLS") return p75.toFixed(3);
  if (name === "LCP" || name === "FCP" || name === "TTFB") {
    return p75 >= 1000 ? `${(p75 / 1000).toFixed(2)}s` : `${Math.round(p75)}ms`;
  }
  return `${Math.round(p75)}ms`;
}

function thresholdHint(name: string): string {
  switch (name) {
    case "LCP":
      return "≤2.5s";
    case "INP":
      return "≤200ms";
    case "CLS":
      return "≤0.1";
    case "FCP":
      return "≤1.8s";
    case "TTFB":
      return "≤800ms";
    default:
      return "";
  }
}

export function AdminWebVitalsCard({ summary }: { summary: WebVitalsDashboardSummary }) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur">
      <div className="border-b border-border/60 px-4 py-3">
        <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          [ Core Web Vitals · {summary.periodDays}d ]
        </h2>
        <p className="mt-1 font-mono text-[11px] text-muted-foreground">
          {summary.configured
            ? summary.lastSampleAt
              ? `// 최근 샘플 ${new Date(summary.lastSampleAt).toLocaleString("ko-KR")}`
              : "// 아직 수집된 샘플 없음"
            : "// DB 미연결"}
        </p>
      </div>

      {!summary.configured ? (
        <p className="px-4 py-8 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          vitals 수집 비활성
        </p>
      ) : summary.metrics.every((m) => m.count === 0) ? (
        <p className="px-4 py-8 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          트래픽 유입 후 p75·Green 비율이 표시됩니다
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-px bg-border/40 sm:grid-cols-3 lg:grid-cols-5">
          {summary.metrics.map((m) => {
            const green = m.goodPct >= 75;
            const warn = m.goodPct >= 50 && m.goodPct < 75;
            return (
              <li key={m.name} className="bg-card/50 p-4">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  {m.name}
                </p>
                <p className="mt-2 text-xl font-black tabular-nums">
                  {m.count > 0 ? formatMetric(m.name, m.p75) : "—"}
                </p>
                <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                  p75 · 목표 {thresholdHint(m.name)}
                </p>
                <p
                  className={[
                    "mt-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em]",
                    green ? "text-emerald-400" : warn ? "text-amber-300" : "text-red-300",
                  ].join(" ")}
                >
                  {m.count > 0 ? `Green ${m.goodPct}% · n=${m.count}` : "no data"}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

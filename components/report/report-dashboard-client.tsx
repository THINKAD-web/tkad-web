"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CalendarDays,
  Crown,
  Loader2,
  Mail,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import type {
  CpmTrendPoint,
  HotMediaRow,
  IndustrySplitRow,
  NewMediaRow,
  ReportDashboardData,
} from "@/lib/report/dashboard-data";

const PIE_COLORS = ["#a855f7", "#22d3ee", "#ec4899", "#7c3aed", "#0ea5e9", "#f43f5e"];

export function ReportDashboardClient({ isKo }: { isKo: boolean }) {
  const t = useTranslations();
  const [data, setData] = useState<ReportDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/report/dashboard?locale=${isKo ? "ko" : "en"}`,
          { cache: "no-store" },
        );
        const d = await res.json();
        if (cancelled) return;
        if (!res.ok || !d?.ok) {
          setErr(d?.error?.message ?? "Failed to load");
          return;
        }
        setData(d.data as ReportDashboardData);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "network");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isKo]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (err || !data) {
    return (
      <div className="rounded-lg border-2 border-destructive bg-destructive/10 p-6 text-sm text-destructive">
        {isKo ? "대시보드를 불러오지 못했습니다." : "Failed to load dashboard."}
        {err ? `: ${err}` : ""}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {`// `}
        {isKo
          ? `생성 ${new Date(data.generatedAt).toLocaleString("ko-KR")} · 데모 추정치 포함`
          : `Generated ${new Date(data.generatedAt).toLocaleString("en-US")} · contains heuristic estimates`}
      </p>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <HotMediaCard rows={data.hotMedia} isKo={isKo} />
        <IndustrySplitCard rows={data.industrySplit} isKo={isKo} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr,1fr]">
        <CpmTrendCard rows={data.cpmTrend} isKo={isKo} />
        <NewMediaCard rows={data.newMedia} isKo={isKo} />
      </div>

      <NewsletterSubscribeCard isKo={isKo} />

      <div className="text-center font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {`// `}
        {isKo
          ? "본 대시보드의 수치는 자체 데이터 기반의 추정치이며, 정확한 캠페인 평가 자료는 견적 시 제공됩니다."
          : "Numbers are heuristic estimates from our internal data — please refer to your quote for accurate metrics."}
      </div>
      {/* unused imports prevention */}
      <span className="hidden">{t("common.search")}</span>
    </div>
  );
}

function HotMediaCard({
  rows,
  isKo,
}: {
  rows: HotMediaRow[];
  isKo: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border-2 border-border bg-card">
      <header className="flex items-center justify-between border-b-2 border-border bg-muted/40 p-4 sm:p-5">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
            [ {isKo ? "이번 달 인기 매체 TOP 10" : "Top Media This Month"} ]
          </p>
          <h2 className="mt-1 text-lg font-bold tracking-tight text-foreground">
            <Crown className="mr-1.5 inline-block h-4 w-4 text-accent" aria-hidden />
            {isKo ? "지역·문의 기반 핫 매체" : "Hot media by region & inquiries"}
          </h2>
        </div>
      </header>
      {rows.length === 0 ? (
        <p className="p-8 text-center text-sm text-muted-foreground">
          {isKo
            ? "이번 달 활동이 충분치 않아 표시할 매체가 없습니다."
            : "Not enough activity this month yet."}
        </p>
      ) : (
        <ol className="divide-y border-t border-border/40">
          {rows.map((row, i) => (
            <li
              key={row.mediaId}
              className="flex items-center gap-3 p-3 sm:p-4"
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-black ${
                  i < 3
                    ? "bg-accent text-accent-foreground"
                    : "border-2 border-border bg-card text-foreground"
                }`}
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/media/${row.mediaId}`}
                  className="line-clamp-1 text-sm font-bold text-foreground hover:text-accent"
                >
                  {row.name}
                </Link>
                <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  {row.region} · {row.type}
                </p>
              </div>
              <div className="hidden gap-3 text-right font-mono text-[11px] tabular-nums sm:flex">
                <span title="Bookings" className="text-foreground">
                  {row.bookingCount}
                  <span className="ml-0.5 text-[9px] text-muted-foreground">B</span>
                </span>
                <span title="Inquiries" className="text-foreground">
                  {row.inquiryCount}
                  <span className="ml-0.5 text-[9px] text-muted-foreground">I</span>
                </span>
                <span title="Favorites" className="text-foreground">
                  {row.favoriteCount}
                  <span className="ml-0.5 text-[9px] text-muted-foreground">F</span>
                </span>
              </div>
              <span className="ml-2 inline-flex items-center rounded-full border-2 border-accent bg-accent/10 px-2 py-0.5 font-mono text-[10px] font-bold tabular-nums text-accent">
                {row.score}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function IndustrySplitCard({
  rows,
  isKo,
}: {
  rows: IndustrySplitRow[];
  isKo: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border-2 border-border bg-card">
      <header className="border-b-2 border-border bg-muted/40 p-4 sm:p-5">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
          [ {isKo ? "매체 유형별 비중" : "Media Type Share"} ]
        </p>
        <h2 className="mt-1 text-lg font-bold tracking-tight text-foreground">
          <Sparkles className="mr-1.5 inline-block h-4 w-4 text-accent" aria-hidden />
          {isKo ? "이번 달 OOH 활동 도넛" : "OOH activity donut"}
        </h2>
      </header>
      {rows.length === 0 ? (
        <p className="p-8 text-center text-sm text-muted-foreground">
          {isKo ? "데이터 없음" : "No data"}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-0 sm:grid-cols-[1.1fr,1fr]">
          <div className="p-3 sm:p-5">
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={rows}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={56}
                    outerRadius={100}
                    paddingAngle={2}
                    stroke="#0a0a0c"
                    strokeWidth={2}
                    isAnimationActive={false}
                  >
                    {rows.map((entry, idx) => (
                      <Cell
                        key={`cell-${entry.key}`}
                        fill={PIE_COLORS[idx % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      fontFamily:
                        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                      fontSize: 11,
                      background: "#ffffff",
                      border: "2px solid #0a0a0c",
                      borderRadius: 0,
                    }}
                    formatter={(v: number, _n, item) => {
                      const pct =
                        (item?.payload as { pct?: number } | undefined)?.pct;
                      return [`${v} (${pct ?? "—"}%)`, ""];
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="square"
                    wrapperStyle={{
                      fontFamily:
                        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                      fontSize: 11,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <ul className="divide-y border-l border-border/40">
            {rows.map((s, i) => (
              <li
                key={s.key}
                className="flex items-center gap-3 px-4 py-3 font-mono text-[11px]"
              >
                <span
                  aria-hidden
                  className="h-3 w-3 shrink-0 border-2 border-foreground"
                  style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                />
                <span className="min-w-0 flex-1 text-foreground">{s.label}</span>
                <span className="shrink-0 text-muted-foreground">{s.count}</span>
                <span className="w-12 shrink-0 text-right font-bold tabular-nums text-foreground">
                  {s.pct}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function CpmTrendCard({
  rows,
  isKo,
}: {
  rows: CpmTrendPoint[];
  isKo: boolean;
}) {
  const data = useMemo(() => rows, [rows]);
  return (
    <section className="overflow-hidden rounded-2xl border-2 border-border bg-card">
      <header className="border-b-2 border-border bg-muted/40 p-4 sm:p-5">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
          [ {isKo ? "월별 평균 CPM 트렌드" : "Monthly Avg CPM Trend"} ]
        </p>
        <h2 className="mt-1 text-lg font-bold tracking-tight text-foreground">
          <TrendingUp className="mr-1.5 inline-block h-4 w-4 text-accent" aria-hidden />
          {isKo ? "지난 6개월 (원/1,000회)" : "Last 6 months (KRW per 1,000)"}
        </h2>
      </header>
      <div className="p-3 sm:p-5">
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis
                dataKey="label"
                stroke="#525252"
                fontSize={11}
                tickLine={false}
              />
              <YAxis
                stroke="#525252"
                fontSize={11}
                tickFormatter={(v: number) =>
                  v >= 10_000
                    ? `${Math.round(v / 1000)}K`
                    : v.toString()
                }
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  fontSize: 11,
                  background: "#ffffff",
                  border: "2px solid #0a0a0c",
                  borderRadius: 0,
                }}
                formatter={(v: number) => [
                  `₩${v.toLocaleString("ko-KR")}`,
                  isKo ? "평균 CPM" : "Avg CPM",
                ]}
              />
              <Line
                type="monotone"
                dataKey="cpmKrw"
                stroke="#a855f7"
                strokeWidth={3}
                dot={{ fill: "#a855f7", r: 4 }}
                activeDot={{ r: 6 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

function NewMediaCard({
  rows,
  isKo,
}: {
  rows: NewMediaRow[];
  isKo: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border-2 border-border bg-card">
      <header className="border-b-2 border-border bg-muted/40 p-4 sm:p-5">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
          [ {isKo ? "신규 등록 매체 (30일)" : "New Media (30 days)"} ]
        </p>
        <h2 className="mt-1 text-lg font-bold tracking-tight text-foreground">
          <CalendarDays className="mr-1.5 inline-block h-4 w-4 text-accent" aria-hidden />
          {isKo ? "최근 카탈로그 추가" : "Recent catalog additions"}
        </h2>
      </header>
      {rows.length === 0 ? (
        <p className="p-8 text-center text-sm text-muted-foreground">
          {isKo ? "최근 등록된 매체가 없습니다." : "No new media in the last 30 days."}
        </p>
      ) : (
        <ul className="divide-y border-t border-border/40">
          {rows.map((row) => {
            const d = new Date(row.createdAt);
            return (
              <li
                key={row.id}
                className="flex items-center gap-3 p-3 sm:p-4"
              >
                <span className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-md border-2 border-accent bg-accent/10 font-mono text-[9px] font-bold leading-none text-accent">
                  <span>{d.toLocaleString(isKo ? "ko-KR" : "en-US", { month: "short" })}</span>
                  <span className="mt-0.5 text-sm">{d.getDate()}</span>
                </span>
                <Link
                  href={`/media/${row.id}`}
                  className="line-clamp-1 flex-1 text-sm font-bold text-foreground hover:text-accent"
                >
                  {row.name}
                </Link>
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {row.region} · {row.type}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function NewsletterSubscribeCard({ isKo }: { isKo: boolean }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || status === "loading") return;
    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          locale: isKo ? "ko" : "en",
          source: "report_dashboard",
        }),
      });
      if (!res.ok) {
        setStatus("error");
        return;
      }
      setStatus("success");
      setEmail("");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border-2 border-accent bg-accent/5 p-5 sm:p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1.2fr,1fr] sm:gap-6">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
            [ {isKo ? "월간 트렌드 리포트" : "Monthly Trend Report"} ]
          </p>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground">
            <Mail className="mr-1.5 inline-block h-5 w-5 text-accent" aria-hidden />
            {isKo
              ? "트렌드 리포트를 매달 메일로 받아보세요"
              : "Get the trend report monthly in your inbox"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isKo
              ? "매달 첫째 주, 본 대시보드 데이터를 기반으로 한 OOH 인사이트를 보내드립니다."
              : "First week of each month — OOH insights distilled from this dashboard."}
          </p>
        </div>
        <form
          onSubmit={onSubmit}
          className="flex flex-col gap-2 self-end sm:flex-row"
        >
          <label htmlFor="report-newsletter-email" className="sr-only">
            email
          </label>
          <input
            id="report-newsletter-email"
            type="email"
            name="email"
            required
            autoComplete="email"
            value={email}
            disabled={status === "loading" || status === "success"}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="work@company.com"
            className="h-11 min-w-0 flex-1 rounded-md border-2 border-border bg-card px-3 font-mono text-sm text-foreground focus:border-accent focus:outline-none disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={status === "loading" || status === "success"}
            className="h-11 shrink-0 rounded-md border-2 border-accent bg-accent px-5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {status === "loading"
              ? isKo
                ? "전송 중…"
                : "Sending…"
              : status === "success"
                ? isKo
                  ? "구독 완료"
                  : "Subscribed"
                : isKo
                  ? "구독하기"
                  : "Subscribe"}
          </button>
        </form>
      </div>
      {status === "error" ? (
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.16em] text-destructive">
          {isKo
            ? "전송에 실패했습니다. 잠시 후 다시 시도해주세요."
            : "Failed. Please try again."}
        </p>
      ) : null}
    </section>
  );
}

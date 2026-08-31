"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Search, X, MessageSquare } from "lucide-react";

type Stats = {
  todayTurns: number;
  weekTurns: number;
  totalTurns: number;
  totalSessions: number;
  avgTurnsPerSession: number;
  totalTokens: number;
  estCostUsd: number;
};

type SessionRow = {
  sessionId: string;
  lastAt: string | null;
  firstAt: string | null;
  messages: number;
  turns: number;
  tokensUsed: number;
  firstQuestion: string;
  userName: string | null;
  userEmail: string | null;
  userId: string | null;
  ip: string | null;
  pageUrl: string | null;
  model: string | null;
};

type LogsResponse = {
  configured: boolean;
  stats: Stats | null;
  sessions: SessionRow[];
  page: number;
  hasMore: boolean;
};

type DetailMessage = {
  id: string;
  role: string;
  message: string;
  tokensUsed: number | null;
  model: string | null;
  createdAt: string;
};

type DetailResponse = {
  sessionId: string;
  meta: {
    userName: string | null;
    userEmail: string | null;
    ip: string | null;
    userAgent: string | null;
    pageUrl: string | null;
    locale: string | null;
    model: string | null;
  } | null;
  messages: DetailMessage[];
  totalTokens: number;
};

type Period = "today" | "7d" | "30d" | "all";

const PERIODS: { key: Period; label: string }[] = [
  { key: "today", label: "오늘" },
  { key: "7d", label: "7일" },
  { key: "30d", label: "30일" },
  { key: "all", label: "전체" },
];

function periodFrom(period: Period): string | null {
  if (period === "all") return null;
  const now = new Date();
  if (period === "today") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  }
  const days = period === "7d" ? 7 : 30;
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-black tabular-nums text-[color:var(--qp-accent)] dark:text-[color:var(--qp-accent)]">
        {value}
      </p>
      {sub ? <p className="mt-0.5 tkad-type-caption text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

export function AdminChatbotDashboard() {
  const [period, setPeriod] = useState<Period>("7d");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<LogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<DetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [botStatus, setBotStatus] = useState<"active" | "maintenance" | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/chatbot/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { status?: "active" | "maintenance" }) => {
        if (!cancelled) setBotStatus(d.status ?? "active");
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleStatus = async (next: "active" | "maintenance") => {
    if (savingStatus || next === botStatus) return;
    setSavingStatus(true);
    try {
      const res = await fetch("/api/admin/chatbot/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const d = (await res.json()) as { ok?: boolean; status?: string; error?: string };
      if (res.ok && d.ok) setBotStatus(next);
      else window.alert(d.error || "상태 변경 실패");
    } catch {
      window.alert("네트워크 오류");
    } finally {
      setSavingStatus(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const from = periodFrom(period);
      if (from) params.set("from", from);
      if (search) params.set("search", search);
      params.set("page", String(page));
      const res = await fetch(`/api/admin/chatbot/logs?${params.toString()}`, {
        cache: "no-store",
      });
      const d = (await res.json()) as LogsResponse;
      setData(d);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [period, search, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDetail = useCallback(async (sessionId: string) => {
    setDetailLoading(true);
    setDetail({ sessionId, meta: null, messages: [], totalTokens: 0 });
    try {
      const res = await fetch(
        `/api/admin/chatbot/session/${encodeURIComponent(sessionId)}`,
        { cache: "no-store" },
      );
      const d = (await res.json()) as DetailResponse;
      setDetail(d);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const stats = data?.stats;
  const sessions = useMemo(() => data?.sessions ?? [], [data]);
  const notConfigured = data && data.configured === false;

  return (
    <div className="space-y-5">
      {/* 챗봇 상태 토글 */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
        <div className="flex items-center gap-2">
          <span
            className={
              "h-2.5 w-2.5 rounded-full " +
              (botStatus === "maintenance" ? "bg-amber-500" : "bg-emerald-500")
            }
          />
          <span className="text-sm font-bold">챗봇 상태</span>
          <span className="text-xs text-muted-foreground">
            {botStatus === "maintenance"
              ? "점검 중 — 사용자에게 점검 안내가 표시됩니다"
              : botStatus === "active"
                ? "사용 중"
                : "확인 중…"}
          </span>
        </div>
        <div className="inline-flex rounded-xl border border-gray-200 p-0.5 dark:border-white/10">
          {([
            ["active", "사용중"],
            ["maintenance", "점검중"],
          ] as const).map(([val, label]) => (
            <button
              key={val}
              type="button"
              disabled={savingStatus}
              onClick={() => void toggleStatus(val)}
              className={
                "rounded-lg px-3 py-1.5 tkad-type-title transition-colors disabled:opacity-50 " +
                (botStatus === val
                  ? val === "maintenance"
                    ? "bg-amber-500 text-white"
                    : "bg-emerald-600 text-white"
                  : "text-muted-foreground hover:bg-gray-50 dark:hover:bg-white/5")
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="오늘 대화" value={(stats?.todayTurns ?? 0).toLocaleString()} sub="질문 수" />
        <StatCard label="최근 7일" value={(stats?.weekTurns ?? 0).toLocaleString()} sub="질문 수" />
        <StatCard label="총 세션" value={(stats?.totalSessions ?? 0).toLocaleString()} />
        <StatCard label="총 질문" value={(stats?.totalTurns ?? 0).toLocaleString()} />
        <StatCard label="평균 대화" value={`${stats?.avgTurnsPerSession ?? 0}`} sub="세션당 질문" />
        <StatCard
          label="토큰 사용"
          value={(stats?.totalTokens ?? 0).toLocaleString()}
          sub={`≈ $${stats?.estCostUsd ?? 0} (추정)`}
        />
      </div>

      {/* 필터 + 검색 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-xl border border-gray-200 p-0.5 dark:border-white/10">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => {
                setPeriod(p.key);
                setPage(1);
              }}
              className={
                "rounded-lg px-3 py-1.5 tkad-type-title transition-colors " +
                (period === p.key
                  ? "bg-[color:var(--qp-accent)] text-white"
                  : "text-muted-foreground hover:bg-gray-50 dark:hover:bg-white/5")
              }
            >
              {p.label}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setSearch(searchInput.trim());
          }}
          className="flex min-w-0 flex-1 items-center gap-2"
        >
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-gray-200 px-3 py-1.5 dark:border-white/10">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="질문/이름/이메일 검색"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 px-3 tkad-type-title dark:border-white/10"
          >
            <RefreshCw className={"h-3.5 w-3.5 " + (loading ? "animate-spin" : "")} />
            새로고침
          </button>
        </form>
      </div>

      {/* 세션 테이블 */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-xs uppercase text-muted-foreground dark:border-white/10 dark:bg-white/5">
              <th className="p-3">시각</th>
              <th className="p-3">사용자</th>
              <th className="p-3">첫 질문</th>
              <th className="p-3 text-center">대화</th>
              <th className="p-3">페이지</th>
              <th className="p-3">IP</th>
            </tr>
          </thead>
          <tbody>
            {loading && sessions.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-10 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            ) : notConfigured ? (
              <tr>
                <td colSpan={6} className="p-10 text-center text-muted-foreground">
                  데이터베이스가 설정되지 않았습니다.
                </td>
              </tr>
            ) : sessions.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-10 text-center text-muted-foreground">
                  대화 로그가 없습니다.
                </td>
              </tr>
            ) : (
              sessions.map((s) => (
                <tr
                  key={s.sessionId}
                  onClick={() => void openDetail(s.sessionId)}
                  className="cursor-pointer border-b transition-colors hover:bg-[color:var(--qp-accent-soft)] dark:border-white/5 dark:hover:bg-white/5"
                >
                  <td className="whitespace-nowrap p-3 text-xs text-muted-foreground">
                    {fmtDateTime(s.lastAt)}
                  </td>
                  <td className="p-3">
                    {s.userName ? (
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{s.userName}</p>
                        {s.userEmail ? (
                          <p className="truncate tkad-type-caption text-muted-foreground">
                            {s.userEmail}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">비로그인</span>
                    )}
                  </td>
                  <td className="max-w-[280px] p-3">
                    <p className="line-clamp-2 text-xs text-foreground/90">
                      {s.firstQuestion || "—"}
                    </p>
                  </td>
                  <td className="p-3 text-center">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--qp-accent)]/10 px-2 py-0.5 tkad-type-title text-[color:var(--qp-accent)] dark:text-[color:var(--qp-accent)]">
                      <MessageSquare className="h-3 w-3" />
                      {s.turns}
                    </span>
                  </td>
                  <td className="max-w-[160px] p-3">
                    <p className="truncate tkad-type-caption text-muted-foreground">
                      {s.pageUrl || "—"}
                    </p>
                  </td>
                  <td className="whitespace-nowrap p-3 tkad-type-caption text-muted-foreground">
                    {s.ip || "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {(page > 1 || data?.hasMore) && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-gray-200 px-3 py-1.5 tkad-type-title disabled:opacity-40 dark:border-white/10"
          >
            이전
          </button>
          <span className="text-xs text-muted-foreground">{page}</span>
          <button
            type="button"
            disabled={!data?.hasMore || loading}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 tkad-type-title disabled:opacity-40 dark:border-white/10"
          >
            다음
          </button>
        </div>
      )}

      {/* 세션 상세 모달 */}
      {detail ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6"
          onClick={() => setDetail(null)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl dark:bg-[#15151f] sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-gray-100 p-4 dark:border-white/10">
              <div className="min-w-0">
                <p className="font-bold">
                  {detail.meta?.userName || "비로그인 사용자"}
                </p>
                <p className="truncate tkad-type-caption text-muted-foreground">
                  {[
                    detail.meta?.userEmail,
                    detail.meta?.ip,
                    detail.meta?.pageUrl,
                    detail.meta?.model,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "메타 정보 없음"}
                  {detail.totalTokens
                    ? ` · ${detail.totalTokens.toLocaleString()} tokens`
                    : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-gray-100 dark:hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50 p-4 dark:bg-black/20">
              {detailLoading ? (
                <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                detail.messages.map((m) => {
                  const isUser = m.role === "user";
                  return (
                    <div
                      key={m.id}
                      className={"flex " + (isUser ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={
                          "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm " +
                          (isUser
                            ? "rounded-br-sm bg-[color:var(--qp-accent)] text-white"
                            : "rounded-bl-sm border border-gray-200 bg-white text-foreground dark:border-white/10 dark:bg-white/5")
                        }
                      >
                        <p className="whitespace-pre-wrap break-words">{m.message}</p>
                        <p
                          className={
                            "mt-1 tkad-type-note " +
                            (isUser ? "text-white/60" : "text-muted-foreground")
                          }
                        >
                          {fmtDateTime(m.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

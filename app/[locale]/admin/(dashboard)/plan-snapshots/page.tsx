"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  BookOpen,
  ExternalLink,
  Loader2,
  MessageSquare,
  RefreshCw,
  RotateCcw,
  X,
} from "lucide-react";
import type { AdminSavedPlanDetail, AdminSavedPlanRow } from "@/lib/saved-plan-cart/admin-queries";
import type { AdminPlanReportActivityRow } from "@/lib/plan-report-activity/types";
import {
  eventTypeLabelKo,
  sourceLabelKo,
} from "@/lib/plan-report-activity/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type IntentFilter = "all" | "case" | "community" | "none";

function fmt(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtBudget(monthlyWon: number | null, duration: number | null) {
  if (!monthlyWon || monthlyWon <= 0) return "—";
  const months = duration && duration > 0 ? duration : 1;
  const man = Math.round((monthlyWon * months) / 10_000);
  return `${man.toLocaleString("ko-KR")}만원 (${months}개월)`;
}

function roleLabel(role: string) {
  if (role === "admin") return "관리자";
  if (role === "media_owner") return "매체사";
  return "광고주";
}

export default function AdminPlanSnapshotsPage() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = useMemo(() => pathname.split("/")[1] || "ko", [pathname]);
  const userIdFilter = searchParams.get("userId")?.trim() || "";

  const [items, setItems] = useState<AdminSavedPlanRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [intentFilter, setIntentFilter] = useState<IntentFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminSavedPlanDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [adminNote, setAdminNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [promoting, setPromoting] = useState<"case" | "community" | null>(null);
  const [promoteMsg, setPromoteMsg] = useState<string | null>(null);
  const [activities, setActivities] = useState<AdminPlanReportActivityRow[]>([]);
  const [activityTotal, setActivityTotal] = useState(0);
  const [activityLoading, setActivityLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "20",
        status: "saved",
      });
      if (q.trim()) params.set("q", q.trim());
      if (intentFilter === "case" || intentFilter === "community") {
        params.set("publishIntent", intentFilter);
      } else if (intentFilter === "none") {
        params.set("publishIntent", "__none__");
      }
      if (userIdFilter) params.set("userId", userIdFilter);

      const res = await fetch(`/api/admin/plan-snapshots?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "load failed");
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load failed");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, q, intentFilter, userIdFilter]);

  const loadActivities = useCallback(async () => {
    setActivityLoading(true);
    try {
      const params = new URLSearchParams({
        page: "1",
        pageSize: userIdFilter ? "30" : "20",
      });
      if (userIdFilter) params.set("userId", userIdFilter);
      const res = await fetch(`/api/admin/plan-report-activity?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "activity load failed");
      setActivities(data.items ?? []);
      setActivityTotal(data.total ?? 0);
    } catch {
      setActivities([]);
      setActivityTotal(0);
    } finally {
      setActivityLoading(false);
    }
  }, [userIdFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadActivities();
  }, [loadActivities]);

  useEffect(() => {
    setPage(1);
  }, [userIdFilter]);

  async function openDetail(id: string) {
    setSelectedId(id);
    setDetailLoading(true);
    setPromoteMsg(null);
    try {
      const res = await fetch(`/api/admin/plan-snapshots/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "detail failed");
      setDetail(data as AdminSavedPlanDetail);
      setAdminNote(data.adminNote ?? "");
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  async function saveAdminNote() {
    if (!selectedId) return;
    setSavingNote(true);
    try {
      const res = await fetch(`/api/admin/plan-snapshots/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminNote: adminNote.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      setDetail(data as AdminSavedPlanDetail);
      void load();
    } finally {
      setSavingNote(false);
    }
  }

  async function promote(target: "case" | "community") {
    if (!selectedId) return;
    setPromoting(target);
    setPromoteMsg(null);
    try {
      const res = await fetch(`/api/admin/plan-snapshots/${selectedId}/promote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target,
          publishCommunity: target === "community",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "승격 실패");
      setDetail(data.detail as AdminSavedPlanDetail);
      setAdminNote(data.detail?.adminNote ?? "");
      if (target === "case") {
        setPromoteMsg(`사례 초안이 생성되었습니다. (ID: ${data.successCaseId})`);
      } else {
        setPromoteMsg(`커뮤니티 글이 생성되었습니다. (ID: ${data.communityPostId})`);
      }
      void load();
    } catch (e) {
      setPromoteMsg(e instanceof Error ? e.message : "승격 실패");
    } finally {
      setPromoting(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / 20));
  const filteredUserLabel = useMemo(() => {
    if (!userIdFilter) return null;
    const fromList = items.find((row) => row.user.id === userIdFilter)?.user;
    if (fromList) return `${fromList.name} (${fromList.email})`;
    const fromActivity = activities.find((a) => a.user.id === userIdFilter)?.user;
    if (fromActivity) return `${fromActivity.name} (${fromActivity.email})`;
    return userIdFilter;
  }, [userIdFilter, items, activities]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">저장된 사용자 플랜</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          저장 플랜·보고서 조회·PDF/PPT 다운로드를 확인합니다. 회원별 상세는{" "}
          <Link href={`/${locale}/admin/users`} className="text-cyan-700 underline dark:text-cyan-400">
            사용자 목록
          </Link>
          의 「플랜·활동」 또는 CRM 프로필에서도 볼 수 있습니다.
        </p>
        {userIdFilter ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm dark:border-cyan-900/40 dark:bg-cyan-950/30">
            <span>
              회원 필터: <strong>{filteredUserLabel}</strong>
            </span>
            <Link
              href={`/${locale}/admin/plan-snapshots`}
              className="text-xs font-semibold text-cyan-800 underline dark:text-cyan-300"
            >
              필터 해제
            </Link>
          </div>
        ) : null}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">필터</CardTitle>
          <CardDescription>제목·지역·사용자 이름·이메일 검색</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setPage(1);
                void load();
              }
            }}
            placeholder="검색…"
            className="h-10 min-w-[12rem] flex-1 rounded-lg border border-border bg-background px-3 text-sm"
          />
          <select
            value={intentFilter}
            onChange={(e) => {
              setIntentFilter(e.target.value as IntentFilter);
              setPage(1);
            }}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
          >
            <option value="all">활용 표시 전체</option>
            <option value="case">사례 후보만</option>
            <option value="community">커뮤니티 후보만</option>
            <option value="none">표시 없음</option>
          </select>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold"
          >
            <RefreshCw className="h-4 w-4" />
            새로고침
          </button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">보고서 활동</CardTitle>
          <CardDescription>
            {userIdFilter
              ? `이 회원의 조회·PDF/PPT 다운로드 (총 ${activityTotal}건)`
              : `전체 회원 최근 활동 (총 ${activityTotal}건)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activityLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : activities.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              기록된 보고서 활동이 없습니다. 회원이 로그인 후 보고서를 열거나
              PDF/PPT를 받으면 여기에 표시됩니다.
            </p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {activities.map((row) => (
                <li key={row.id} className="flex flex-wrap items-start justify-between gap-2 py-2.5">
                  <div>
                    {!userIdFilter ? (
                      <Link
                        href={`/${locale}/admin/plan-snapshots?userId=${row.user.id}`}
                        className="mb-0.5 block text-xs font-semibold text-cyan-700 hover:underline dark:text-cyan-400"
                      >
                        {row.user.name} · {row.user.email}
                      </Link>
                    ) : null}
                    <div className="font-medium">
                      {eventTypeLabelKo(row.eventType)}
                      {row.format ? ` · ${row.format.toUpperCase()}` : ""}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {sourceLabelKo(row.source)}
                      {row.mediaCount > 0 ? ` · 매체 ${row.mediaCount}개` : ""}
                      {row.goalTitle ? ` · ${row.goalTitle}` : ""}
                    </div>
                    {row.regionsText ? (
                      <div className="text-xs text-muted-foreground">{row.regionsText}</div>
                    ) : null}
                  </div>
                  <time className="shrink-0 text-xs text-muted-foreground">
                    {fmt(row.createdAt)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[56rem] border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-xs font-semibold text-muted-foreground">
              <th className="px-3 py-2.5">제목 / 목표</th>
              <th className="px-3 py-2.5">작성자</th>
              <th className="px-3 py-2.5">구성</th>
              <th className="px-3 py-2.5">사용</th>
              <th className="px-3 py-2.5">승격</th>
              <th className="px-3 py-2.5">저장일</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">
                  저장된 플랜이 없습니다
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr
                  key={row.id}
                  className="cursor-pointer border-b hover:bg-muted/30"
                  onClick={() => void openDetail(row.id)}
                >
                  <td className="px-3 py-2.5">
                    <div className="font-medium">{row.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {row.goalTitle ?? "—"}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div>{row.user.name}</div>
                    <div className="text-xs text-muted-foreground">{row.user.email}</div>
                    {row.user.company ? (
                      <div className="text-xs text-muted-foreground">{row.user.company}</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    <div>매체 {row.mediaCount}개</div>
                    <div className="text-muted-foreground">{row.regionsText ?? "—"}</div>
                    <div className="text-muted-foreground">
                      {fmtBudget(row.totalBudget, row.duration)}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    <div className="inline-flex items-center gap-1">
                      <RotateCcw className="h-3 w-3" />
                      불러오기 {row.restoreCount}회
                    </div>
                    {row.lastRestoredAt ? (
                      <div className="text-muted-foreground">
                        최근 {fmt(row.lastRestoredAt)}
                      </div>
                    ) : null}
                    <div className="mt-0.5">
                      {row.publishIntent === "case"
                        ? "사례 희망"
                        : row.publishIntent === "community"
                          ? "커뮤니티 희망"
                          : "—"}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {row.promotedSuccessCaseId ? (
                      <span className="text-emerald-700">사례 ✓</span>
                    ) : null}
                    {row.promotedCommunityPostId ? (
                      <span className="ml-1 text-blue-700">커뮤니티 ✓</span>
                    ) : null}
                    {!row.promotedSuccessCaseId && !row.promotedCommunityPostId ? "—" : null}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {fmt(row.createdAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">총 {total}건</span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40"
          >
            이전
          </button>
          <span className="px-2 py-1.5 tabular-nums">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40"
          >
            다음
          </button>
        </div>
      </div>

      {selectedId ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
          <div className="h-full w-full max-w-xl overflow-y-auto border-l border-border bg-background p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-bold">플랜 상세</h2>
              <button
                type="button"
                onClick={() => {
                  setSelectedId(null);
                  setDetail(null);
                  setPromoteMsg(null);
                }}
                className="rounded-lg p-1 hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {detailLoading ? (
              <div className="mt-10 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : detail ? (
              <div className="mt-4 space-y-5 text-sm">
                <section className="rounded-lg border border-border bg-muted/20 p-3">
                  <p className="text-xs font-semibold text-muted-foreground">작성자</p>
                  <p className="mt-1 font-semibold">{detail.user.name}</p>
                  <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                    <div>
                      <dt className="text-muted-foreground">이메일</dt>
                      <dd className="break-all">{detail.user.email}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">역할</dt>
                      <dd>{roleLabel(detail.user.role)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">회사</dt>
                      <dd>{detail.user.company ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">연락처</dt>
                      <dd>{detail.user.phone ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">지역</dt>
                      <dd>{detail.user.region ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">가입일</dt>
                      <dd>{fmt(detail.user.createdAt)}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-muted-foreground">최근 로그인</dt>
                      <dd>
                        {detail.user.lastLoginAt
                          ? fmt(detail.user.lastLoginAt)
                          : "—"}
                      </dd>
                    </div>
                  </dl>
                </section>

                <section>
                  <p className="text-xs text-muted-foreground">플랜 제목</p>
                  <p className="font-semibold">{detail.title}</p>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-muted-foreground">목표</p>
                      <p>{detail.goalTitle ?? detail.campaignGoal ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">기간</p>
                      <p>{detail.duration ? `${detail.duration}개월` : "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">지역</p>
                      <p>{detail.regionsText ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">예산(기간)</p>
                      <p>{fmtBudget(detail.totalBudget, detail.duration)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">출처</p>
                      <p>{detail.source === "plan_report" ? "보고서" : "내 플랜"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">불러오기</p>
                      <p>
                        {detail.restoreCount}회
                        {detail.lastRestoredAt
                          ? ` · 최근 ${fmt(detail.lastRestoredAt)}`
                          : ""}
                      </p>
                    </div>
                  </div>
                </section>

                {detail.description ? (
                  <section>
                    <p className="text-xs text-muted-foreground">사용자 메모</p>
                    <p className="whitespace-pre-wrap">{detail.description}</p>
                  </section>
                ) : null}

                <section>
                  <p className="mb-2 text-xs font-semibold text-muted-foreground">
                    매체 ({detail.items.length})
                  </p>
                  <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-2 text-xs">
                    {detail.items.map((m) => (
                      <li key={m.mediaId}>
                        <span className="font-medium">{m.mediaName}</span>
                        <span className="text-muted-foreground">
                          {" "}
                          · {m.region} · {m.mediaType}
                          {m.addedFrom ? ` · ${m.addedFrom}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>

                {detail.reportSummary?.regionalBreakdown?.length ? (
                  <section>
                    <p className="mb-2 text-xs font-semibold text-muted-foreground">
                      지역별 요약
                    </p>
                    <ul className="space-y-1 text-xs">
                      {detail.reportSummary.regionalBreakdown.map((r) => (
                        <li key={r.regionKey}>
                          {r.label} — {r.mediaCount}개 · 예산 {r.budgetPct}%
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                <section className="rounded-lg border border-dashed border-border p-3">
                  <p className="text-xs font-semibold text-muted-foreground">
                    사례·커뮤니티 승격
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    저장 플랜 내용을 초안으로 생성합니다. 사례는 AI 콘텐츠에서 검수·발행하세요.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={promoting !== null}
                      onClick={() => void promote("case")}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      {promoting === "case" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <BookOpen className="h-3.5 w-3.5" />
                      )}
                      {detail.promotedSuccessCaseId ? "사례 다시 열기" : "사례로 승격"}
                    </button>
                    <button
                      type="button"
                      disabled={promoting !== null}
                      onClick={() => void promote("community")}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      {promoting === "community" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <MessageSquare className="h-3.5 w-3.5" />
                      )}
                      {detail.promotedCommunityPostId
                        ? "커뮤니티 다시 열기"
                        : "커뮤니티로 승격"}
                    </button>
                  </div>
                  {promoteMsg ? (
                    <p className="mt-2 text-xs text-emerald-700">{promoteMsg}</p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-3 text-xs">
                    {detail.promotedSuccessCaseId ? (
                      <Link
                        href={`/${locale}/admin/ai-content/edit/${detail.promotedSuccessCaseId}?type=success_case`}
                        className="inline-flex items-center gap-1 text-emerald-700 underline"
                        target="_blank"
                      >
                        사례 편집
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    ) : null}
                    {detail.promotedCommunityPostId ? (
                      <Link
                        href={`/${locale}/admin/community`}
                        className="inline-flex items-center gap-1 text-blue-700 underline"
                        target="_blank"
                      >
                        커뮤니티 관리
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    ) : null}
                    <Link
                      href={`/${locale}/community`}
                      className="inline-flex items-center gap-1 text-muted-foreground underline"
                      target="_blank"
                    >
                      공개 커뮤니티
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </section>

                <section>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                    운영 메모
                  </label>
                  <textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    rows={4}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    placeholder="사례·커뮤니티 전환 시 참고"
                  />
                  <button
                    type="button"
                    disabled={savingNote}
                    onClick={() => void saveAdminNote()}
                    className="mt-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
                  >
                    메모 저장
                  </button>
                </section>
              </div>
            ) : (
              <p className="mt-6 text-sm text-muted-foreground">불러오지 못했습니다.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

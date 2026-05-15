"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  Eye,
  EyeOff,
  Trash2,
  RefreshCw,
  Flag,
  MessageSquare,
  Loader2,
  X,
} from "lucide-react";
import {
  COMMUNITY_CATEGORIES,
  COMMUNITY_CATEGORY_LABELS,
  type CommunityCategory,
} from "@/lib/community/types";
import type {
  AdminPostListItem,
  AdminCommentListItem,
  AdminReportItem,
} from "@/lib/community/admin-queries";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Tab = "posts" | "comments";
type StatusFilter = "all" | "published" | "hidden" | "deleted";
type AdminCommunityStats = {
  postsTotal: number;
  postsHidden: number;
  postsWithReports: number;
  commentsTotal: number;
  commentsHidden: number;
  commentsWithReports: number;
};
type AdminListResponse<T> = {
  items?: T[];
  total?: number;
  page?: number;
  pageSize?: number;
  error?: string;
};

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: "전체",
  published: "정상",
  hidden: "숨김",
  deleted: "삭제",
};

function fmt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminCommunityPage() {
  const pathname = usePathname();
  const locale = useMemo(() => pathname.split("/")[1] || "ko", [pathname]);
  const [tab, setTab] = useState<Tab>("posts");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CommunityCategory | "all">("all");
  const [reportsOnly, setReportsOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState<AdminPostListItem[]>([]);
  const [comments, setComments] = useState<AdminCommentListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<AdminCommunityStats | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(30);
  const [reportsTarget, setReportsTarget] = useState<{
    type: "post" | "comment";
    id: string;
  } | null>(null);

  useEffect(() => {
    setPage(1);
  }, [tab, statusFilter, categoryFilter, reportsOnly]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (statusFilter !== "all") qs.set("status", statusFilter);
      if (reportsOnly) qs.set("hasReports", "1");
      if (tab === "posts" && categoryFilter !== "all")
        qs.set("category", categoryFilter);
      qs.set("page", String(page));

      const url =
        tab === "posts"
          ? `/api/admin/community/posts?${qs}`
          : `/api/admin/community/comments?${qs}`;
      const [res, statsRes] = await Promise.all([
        fetch(url, { credentials: "include" }),
        fetch("/api/admin/community/stats", { credentials: "include" }),
      ]);
      const data = (await res.json()) as AdminListResponse<
        AdminPostListItem | AdminCommentListItem
      >;
      const statsData = (await statsRes.json().catch(() => ({}))) as {
        stats?: AdminCommunityStats;
      };
      if (!res.ok) {
        setError(data.error || "불러오지 못했습니다.");
        if (tab === "posts") setPosts([]);
        else setComments([]);
        setTotal(0);
        return;
      }
      if (tab === "posts") setPosts((data.items as AdminPostListItem[]) ?? []);
      else setComments((data.items as AdminCommentListItem[]) ?? []);
      setTotal(data.total ?? 0);
      setPageSize(data.pageSize ?? 30);
      if (statsRes.ok && statsData.stats) {
        setStats(statsData.stats);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "네트워크 오류");
    } finally {
      setLoading(false);
    }
  }, [tab, statusFilter, categoryFilter, reportsOnly, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const pageEnd = total === 0 ? 0 : Math.min(page * pageSize, total);
  const reportedTotal =
    (stats?.postsWithReports ?? 0) + (stats?.commentsWithReports ?? 0);
  const hiddenTotal = (stats?.postsHidden ?? 0) + (stats?.commentsHidden ?? 0);

  const updateStatus = async (
    type: "post" | "comment",
    id: string,
    status: "published" | "hidden" | "deleted",
  ) => {
    if (
      status === "deleted" &&
      !confirm("정말로 삭제(소프트) 하시겠습니까? 사용자에게 보이지 않습니다.")
    )
      return;
    try {
      const res = await fetch(
        type === "post"
          ? `/api/admin/community/posts/${id}`
          : `/api/admin/community/comments/${id}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(`실패: ${j.error || res.status}`);
        return;
      }
      void load();
    } catch (e) {
      alert(`네트워크 오류: ${e instanceof Error ? e.message : ""}`);
    }
  };

  const hardDelete = async (type: "post" | "comment", id: string) => {
    if (
      !confirm(
        "⚠️ DB 영구 삭제됩니다. 복구 불가. 게시글 삭제 시 댓글도 함께 삭제됩니다. 계속하시겠습니까?",
      )
    )
      return;
    try {
      const res = await fetch(
        type === "post"
          ? `/api/admin/community/posts/${id}`
          : `/api/admin/community/comments/${id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(`실패: ${j.error || res.status}`);
        return;
      }
      void load();
    } catch (e) {
      alert(`네트워크 오류: ${e instanceof Error ? e.message : ""}`);
    }
  };

  const tabBtn = (active: boolean) =>
    `inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
      active
        ? "bg-background text-foreground shadow-sm"
        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
    }`;

  return (
    <div className="space-y-6 text-foreground">
      <Card className="py-4">
        <CardHeader className="gap-2 pb-2">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            [ ADMIN · COMMUNITY MODERATION ]
          </p>
          <CardTitle className="text-2xl font-bold tracking-tight">
            커뮤니티 모더레이션
          </CardTitle>
          <CardDescription className="font-mono text-xs">
            신고된 글 / 댓글 검토 · 복구 · 영구 삭제 / 신고 사유 확인
          </CardDescription>
          <div className="pt-1">
            <a
              href={`/${locale}/community`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
            >
              공개 커뮤니티 보기
            </a>
          </div>
        </CardHeader>
      </Card>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "총 게시글", value: stats?.postsTotal ?? 0 },
          { label: "총 댓글", value: stats?.commentsTotal ?? 0 },
          { label: "신고 누적", value: reportedTotal },
          { label: "숨김/삭제", value: hiddenTotal },
        ].map((item) => (
          <Card key={item.label} className="py-0">
            <CardContent className="py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {item.label}
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                {item.value.toLocaleString("ko-KR")}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="flex w-fit flex-wrap gap-1 rounded-lg border border-border bg-muted/40 p-1">
        <button type="button" onClick={() => setTab("posts")} className={tabBtn(tab === "posts")}>
          <MessageSquare className="h-4 w-4 shrink-0" />
          게시글
        </button>
        <button
          type="button"
          onClick={() => setTab("comments")}
          className={tabBtn(tab === "comments")}
        >
          <MessageSquare className="h-4 w-4 shrink-0" />
          댓글
        </button>
      </div>

      <Card className="py-0">
        <CardContent className="flex flex-wrap items-center gap-3 py-4">
          <span className="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {tab === "posts" ? "게시글" : "댓글"} {total.toLocaleString("ko-KR")}건
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">상태</span>
            <div className="flex w-fit flex-wrap gap-1 rounded-lg border border-border bg-background p-1">
              {(["all", "published", "hidden", "deleted"] as StatusFilter[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    statusFilter === s
                      ? "bg-muted text-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {tab === "posts" ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">카테고리</span>
              <div className="flex w-fit max-w-full flex-wrap gap-1 rounded-lg border border-border bg-background p-1">
                {(["all", ...COMMUNITY_CATEGORIES] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategoryFilter(c as CommunityCategory | "all")}
                    className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                      categoryFilter === c
                        ? "bg-muted text-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    {c === "all" ? "전체" : COMMUNITY_CATEGORY_LABELS[c].ko}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <label className="ml-auto inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
            <input
              type="checkbox"
              checked={reportsOnly}
              onChange={(e) => setReportsOnly(e.target.checked)}
              className="h-4 w-4 rounded border border-border accent-cta"
            />
            신고된 항목만
          </label>

          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            새로고침
          </button>

          <span className="w-full text-right text-xs text-muted-foreground sm:ml-auto sm:w-auto">
            {pageStart}-{pageEnd} / {total.toLocaleString("ko-KR")}
          </span>
        </CardContent>
      </Card>

      {error ? (
        <Card className="border-destructive/40 bg-destructive/5 py-0">
          <CardContent className="py-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      {/* 목록 */}
      {tab === "posts" ? (
        <PostsTable
          locale={locale}
          rows={posts}
          loading={loading}
          onUpdateStatus={(id, s) => updateStatus("post", id, s)}
          onHardDelete={(id) => hardDelete("post", id)}
          onViewReports={(id) => setReportsTarget({ type: "post", id })}
        />
      ) : (
        <CommentsTable
          locale={locale}
          rows={comments}
          loading={loading}
          onUpdateStatus={(id, s) => updateStatus("comment", id, s)}
          onHardDelete={(id) => hardDelete("comment", id)}
          onViewReports={(id) => setReportsTarget({ type: "comment", id })}
        />
      )}

      {reportsTarget ? (
        <ReportsModal
          targetType={reportsTarget.type}
          targetId={reportsTarget.id}
          onClose={() => setReportsTarget(null)}
        />
      ) : null}

      <Card className="py-0">
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {page} / {totalPages} 페이지
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted disabled:opacity-40"
            >
              이전
            </button>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted disabled:opacity-40"
            >
              다음
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    published: {
      label: "정상",
      cls: "border-border bg-muted/50 text-foreground",
    },
    hidden: {
      label: "숨김",
      cls: "border-primary/40 bg-primary/10 text-foreground",
    },
    deleted: {
      label: "삭제",
      cls: "border-border bg-foreground text-background",
    },
  };
  const cfg = map[status] ?? map.published;
  return (
    <span
      className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cfg.cls}`}
    >
      {cfg.label}
    </span>
  );
}

function ActionButtons({
  status,
  onUpdateStatus,
  onHardDelete,
  onViewReports,
  reportCount,
}: {
  status: string;
  onUpdateStatus: (s: "published" | "hidden" | "deleted") => void;
  onHardDelete: () => void;
  onViewReports: () => void;
  reportCount: number;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {reportCount > 0 ? (
        <button
          type="button"
          onClick={onViewReports}
          className="inline-flex items-center gap-1 rounded-md border border-primary bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/20"
          title="신고 사유 보기"
        >
          <Flag className="h-3 w-3" />
          신고 {reportCount}
        </button>
      ) : null}
      {status === "hidden" || status === "deleted" ? (
        <button
          type="button"
          onClick={() => onUpdateStatus("published")}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
          title="복구"
        >
          <Eye className="h-3 w-3" />
          복구
        </button>
      ) : null}
      {status === "published" ? (
        <button
          type="button"
          onClick={() => onUpdateStatus("hidden")}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
          title="숨김 처리"
        >
          <EyeOff className="h-3 w-3" />
          숨김
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => onUpdateStatus("deleted")}
        className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
        title="소프트 삭제 (복구 가능)"
      >
        <Trash2 className="h-3 w-3" />
        삭제
      </button>
      <button
        type="button"
        onClick={onHardDelete}
        className="inline-flex items-center gap-1 rounded-md border border-destructive/40 bg-destructive/5 px-2 py-1 text-[11px] font-medium text-destructive transition-colors hover:bg-destructive/10"
        title="DB 영구 삭제 (복구 불가)"
      >
        <AlertTriangle className="h-3 w-3" />
        영구
      </button>
    </div>
  );
}

function PostsTable({
  locale,
  rows,
  loading,
  onUpdateStatus,
  onHardDelete,
  onViewReports,
}: {
  locale: string;
  rows: AdminPostListItem[];
  loading: boolean;
  onUpdateStatus: (id: string, s: "published" | "hidden" | "deleted") => void;
  onHardDelete: (id: string) => void;
  onViewReports: (id: string) => void;
}) {
  if (loading && rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">불러오는 중…</CardContent>
      </Card>
    );
  }
  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          조건에 맞는 게시글이 없습니다.
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="gap-0 py-0">
      <CardContent className="overflow-x-auto px-0 pb-0 pt-0">
        <table className="w-full min-w-[920px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs font-medium text-muted-foreground">
              {["상태", "카테고리", "제목 / 발췌", "작성자", "신고", "통계", "작성", "관리"].map((h) => (
                <th key={h} className="px-4 py-3 pr-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="px-4 py-3 align-top">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-4 py-3 pr-3 align-top text-muted-foreground">
                  {COMMUNITY_CATEGORY_LABELS[r.category].ko}
                </td>
                <td className="px-4 py-3 pr-3 align-top">
                  <a
                    href={`/${locale}/community/post/${r.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="block font-semibold text-primary underline-offset-2 hover:underline"
                  >
                    {r.title}
                  </a>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.bodyExcerpt}</p>
                </td>
                <td className="px-4 py-3 pr-3 align-top">
                  <p className="text-sm font-medium text-foreground">
                    {r.isAnonymous ? "익명" : r.authorName}
                  </p>
                  {r.authorIp ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">IP {r.authorIp}</p>
                  ) : null}
                </td>
                <td className="px-4 py-3 pr-3 align-top text-center">
                  <span
                    className={`text-sm font-semibold tabular-nums ${
                      r.reportCount > 0 ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {r.reportCount}
                  </span>
                </td>
                <td className="px-4 py-3 pr-3 align-top text-xs uppercase tracking-wide text-muted-foreground">
                  <div className="space-y-0.5 tabular-nums normal-case">
                    <div>조회 {r.viewCount}</div>
                    <div>좋아요 {r.likeCount}</div>
                    <div>댓글 {r.commentCount}</div>
                  </div>
                </td>
                <td className="px-4 py-3 pr-3 align-top text-xs tabular-nums text-muted-foreground">
                  {fmt(r.createdAt)}
                </td>
                <td className="px-4 py-3 align-top">
                  <ActionButtons
                    status={r.status}
                    reportCount={r.reportCount}
                    onUpdateStatus={(s) => onUpdateStatus(r.id, s)}
                    onHardDelete={() => onHardDelete(r.id)}
                    onViewReports={() => onViewReports(r.id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function CommentsTable({
  locale,
  rows,
  loading,
  onUpdateStatus,
  onHardDelete,
  onViewReports,
}: {
  locale: string;
  rows: AdminCommentListItem[];
  loading: boolean;
  onUpdateStatus: (id: string, s: "published" | "hidden" | "deleted") => void;
  onHardDelete: (id: string) => void;
  onViewReports: (id: string) => void;
}) {
  if (loading && rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">불러오는 중…</CardContent>
      </Card>
    );
  }
  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          조건에 맞는 댓글이 없습니다.
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="gap-0 py-0">
      <CardContent className="overflow-x-auto px-0 pb-0 pt-0">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs font-medium text-muted-foreground">
              {["상태", "댓글", "원본 게시글", "작성자", "신고", "작성", "관리"].map((h) => (
                <th key={h} className="px-4 py-3 pr-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="px-4 py-3 align-top">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-4 py-3 pr-3 align-top">
                  <p className="line-clamp-3 text-sm text-foreground">{r.body}</p>
                </td>
                <td className="px-4 py-3 pr-3 align-top">
                  <a
                    href={`/${locale}/community/post/${r.postId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="line-clamp-2 text-sm font-semibold text-primary underline-offset-2 hover:underline"
                  >
                    {r.postTitle}
                  </a>
                </td>
                <td className="px-4 py-3 pr-3 align-top">
                  <p className="text-sm font-medium text-foreground">
                    {r.isAnonymous ? "익명" : r.authorName}
                  </p>
                  {r.authorIp ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">IP {r.authorIp}</p>
                  ) : null}
                </td>
                <td className="px-4 py-3 pr-3 align-top text-center">
                  <span
                    className={`text-sm font-semibold tabular-nums ${
                      r.reportCount > 0 ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {r.reportCount}
                  </span>
                </td>
                <td className="px-4 py-3 pr-3 align-top text-xs tabular-nums text-muted-foreground">
                  {fmt(r.createdAt)}
                </td>
                <td className="px-4 py-3 align-top">
                  <ActionButtons
                    status={r.status}
                    reportCount={r.reportCount}
                    onUpdateStatus={(s) => onUpdateStatus(r.id, s)}
                    onHardDelete={() => onHardDelete(r.id)}
                    onViewReports={() => onViewReports(r.id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function ReportsModal({
  targetType,
  targetId,
  onClose,
}: {
  targetType: "post" | "comment";
  targetId: string;
  onClose: () => void;
}) {
  const [reports, setReports] = useState<AdminReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/admin/community/reports/${targetType}/${targetId}`,
          { credentials: "include" },
        );
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error || "불러오지 못했습니다.");
          return;
        }
        setReports(data.reports ?? []);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "네트워크 오류");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [targetType, targetId]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm dark:bg-black/60"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
        <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
          <p className="text-sm font-semibold text-foreground">
            {targetType === "post" ? "게시글" : "댓글"} 신고 사유
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="닫기"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-5">
          {loading ? (
            <p className="text-sm text-muted-foreground">불러오는 중…</p>
          ) : error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : reports.length === 0 ? (
            <p className="text-sm text-muted-foreground">신고 기록이 없습니다.</p>
          ) : (
            <ul className="space-y-3">
              {reports.map((r) => (
                <li key={r.id} className="rounded-lg border border-border bg-background p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="tabular-nums">{fmt(r.createdAt)}</span>
                    <span>
                      {r.reporterIp ? `IP ${r.reporterIp}` : ""}
                      {r.reporterUserId ? ` · 사용자 ${r.reporterUserId.slice(0, 8)}` : ""}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{r.reason}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

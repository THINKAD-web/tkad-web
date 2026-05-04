"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

type Tab = "posts" | "comments";
type StatusFilter = "all" | "published" | "hidden" | "deleted";

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
  const [tab, setTab] = useState<Tab>("posts");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CommunityCategory | "all">("all");
  const [reportsOnly, setReportsOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState<AdminPostListItem[]>([]);
  const [comments, setComments] = useState<AdminCommentListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reportsTarget, setReportsTarget] = useState<{
    type: "post" | "comment";
    id: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (statusFilter !== "all") qs.set("status", statusFilter);
      if (reportsOnly) qs.set("hasReports", "1");
      if (tab === "posts" && categoryFilter !== "all")
        qs.set("category", categoryFilter);

      const url =
        tab === "posts"
          ? `/api/admin/community/posts?${qs}`
          : `/api/admin/community/comments?${qs}`;
      const res = await fetch(url, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "불러오지 못했습니다.");
        if (tab === "posts") setPosts([]);
        else setComments([]);
        return;
      }
      if (tab === "posts") setPosts(data.items ?? []);
      else setComments(data.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "네트워크 오류");
    } finally {
      setLoading(false);
    }
  }, [tab, statusFilter, categoryFilter, reportsOnly]);

  useEffect(() => {
    void load();
  }, [load]);

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

  const list = tab === "posts" ? posts : comments;

  return (
    <div className="space-y-6">
      <header className="border-2 border-border bg-foreground p-6 text-background">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
          [ ADMIN · COMMUNITY MODERATION ]
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight">
          커뮤니티 모더레이션
        </h1>
        <p className="mt-2 font-mono text-[11px] tracking-tight text-background/65">
          {`// `}신고된 글 / 댓글 검토 · 복구 · 영구 삭제 / 신고 사유 확인
        </p>
      </header>

      {/* 탭 */}
      <div className="flex flex-wrap gap-0">
        <button
          type="button"
          onClick={() => setTab("posts")}
          className={`-ml-[2px] inline-flex items-center gap-2 border-2 border-border px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.22em] transition-colors ${
            tab === "posts"
              ? "bg-foreground text-background"
              : "bg-card text-foreground hover:bg-foreground hover:text-background"
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          게시글
        </button>
        <button
          type="button"
          onClick={() => setTab("comments")}
          className={`-ml-[2px] inline-flex items-center gap-2 border-2 border-border px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.22em] transition-colors ${
            tab === "comments"
              ? "bg-foreground text-background"
              : "bg-card text-foreground hover:bg-foreground hover:text-background"
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          댓글
        </button>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap items-center gap-3 border-2 border-border bg-muted p-4">
        <div className="flex items-center gap-2">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
            상태
          </p>
          <div className="flex gap-0">
            {(["all", "published", "hidden", "deleted"] as StatusFilter[]).map(
              (s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`-ml-[2px] border-2 border-border px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] transition-colors ${
                    statusFilter === s
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-foreground hover:bg-foreground hover:text-background"
                  }`}
                >
                  {STATUS_LABELS[s]}
                </button>
              ),
            )}
          </div>
        </div>

        {tab === "posts" ? (
          <div className="flex items-center gap-2">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
              카테고리
            </p>
            <div className="flex gap-0">
              {(["all", ...COMMUNITY_CATEGORIES] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategoryFilter(c as CommunityCategory | "all")}
                  className={`-ml-[2px] border-2 border-border px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] transition-colors ${
                    categoryFilter === c
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-foreground hover:bg-foreground hover:text-background"
                  }`}
                >
                  {c === "all" ? "전체" : COMMUNITY_CATEGORY_LABELS[c].ko}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <label className="ml-auto inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-foreground">
          <input
            type="checkbox"
            checked={reportsOnly}
            onChange={(e) => setReportsOnly(e.target.checked)}
            className="h-4 w-4 border-2 border-border"
          />
          신고된 항목만
        </label>

        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 border-2 border-border bg-card px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-foreground transition-colors hover:bg-foreground hover:text-background disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          새로고침
        </button>
      </div>

      {/* 에러 */}
      {error ? (
        <p className="border-2 border-primary bg-card px-4 py-3 font-mono text-[11px] tracking-tight text-primary">
          {`// `}
          {error}
        </p>
      ) : null}

      {/* 목록 */}
      {tab === "posts" ? (
        <PostsTable
          rows={posts}
          loading={loading}
          onUpdateStatus={(id, s) => updateStatus("post", id, s)}
          onHardDelete={(id) => hardDelete("post", id)}
          onViewReports={(id) => setReportsTarget({ type: "post", id })}
        />
      ) : (
        <CommentsTable
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
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    published: { label: "정상", cls: "border-border bg-card text-foreground" },
    hidden: { label: "숨김", cls: "border-primary bg-primary text-primary-foreground" },
    deleted: { label: "삭제", cls: "border-border bg-foreground text-background" },
  };
  const cfg = map[status] ?? map.published;
  return (
    <span
      className={`inline-flex border-2 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] ${cfg.cls}`}
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
          className="inline-flex items-center gap-1 border-2 border-primary bg-primary px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-primary-foreground hover:bg-foreground hover:border-foreground"
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
          className="inline-flex items-center gap-1 border-2 border-border bg-card px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-foreground hover:bg-foreground hover:text-background"
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
          className="inline-flex items-center gap-1 border-2 border-border bg-card px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-foreground hover:bg-foreground hover:text-background"
          title="숨김 처리"
        >
          <EyeOff className="h-3 w-3" />
          숨김
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => onUpdateStatus("deleted")}
        className="inline-flex items-center gap-1 border-2 border-border bg-card px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-foreground hover:bg-foreground hover:text-background"
        title="소프트 삭제 (복구 가능)"
      >
        <Trash2 className="h-3 w-3" />
        삭제
      </button>
      <button
        type="button"
        onClick={onHardDelete}
        className="inline-flex items-center gap-1 border-2 border-primary bg-card px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-primary hover:bg-primary hover:text-primary-foreground"
        title="DB 영구 삭제 (복구 불가)"
      >
        <AlertTriangle className="h-3 w-3" />
        영구
      </button>
    </div>
  );
}

function PostsTable({
  rows,
  loading,
  onUpdateStatus,
  onHardDelete,
  onViewReports,
}: {
  rows: AdminPostListItem[];
  loading: boolean;
  onUpdateStatus: (id: string, s: "published" | "hidden" | "deleted") => void;
  onHardDelete: (id: string) => void;
  onViewReports: (id: string) => void;
}) {
  if (loading && rows.length === 0) {
    return <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-muted-foreground">{`// `}로딩 중…</p>;
  }
  if (rows.length === 0) {
    return (
      <div className="border-2 border-border bg-muted p-12 text-center font-mono text-[12px] uppercase tracking-[0.22em] text-muted-foreground">
        {`// `}조건에 맞는 게시글이 없습니다.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto border-2 border-border">
      <table className="w-full text-sm">
        <thead className="bg-foreground text-primary">
          <tr>
            {["상태", "카테고리", "제목 / 발췌", "작성자", "신고", "통계", "작성", "관리"].map(
              (h) => (
                <th
                  key={h}
                  className="px-3 py-2.5 text-left font-mono text-[10px] font-bold uppercase tracking-[0.22em] border-r-2 border-border last:border-r-0"
                >
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t-2 border-border">
              <td className="px-3 py-2.5 align-top">
                <StatusBadge status={r.status} />
              </td>
              <td className="px-3 py-2.5 align-top font-mono text-[11px] tracking-tight">
                {COMMUNITY_CATEGORY_LABELS[r.category].ko}
              </td>
              <td className="px-3 py-2.5 align-top">
                <a
                  href={`/ko/community/posts/${r.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block font-bold text-foreground hover:text-primary"
                >
                  {r.title}
                </a>
                <p className="mt-1 line-clamp-2 font-mono text-[11px] tracking-tight text-muted-foreground">
                  {r.bodyExcerpt}
                </p>
              </td>
              <td className="px-3 py-2.5 align-top">
                <p className="font-mono text-[11px] text-foreground">
                  {r.isAnonymous ? "익명" : r.authorName}
                </p>
                {r.authorIp ? (
                  <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                    IP {r.authorIp}
                  </p>
                ) : null}
              </td>
              <td className="px-3 py-2.5 align-top text-center">
                <span
                  className={`font-mono text-sm font-bold tabular-nums ${
                    r.reportCount > 0 ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {r.reportCount}
                </span>
              </td>
              <td className="px-3 py-2.5 align-top font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                <div className="space-y-0.5 tabular-nums">
                  <div>조회 {r.viewCount}</div>
                  <div>좋아요 {r.likeCount}</div>
                  <div>댓글 {r.commentCount}</div>
                </div>
              </td>
              <td className="px-3 py-2.5 align-top font-mono text-[11px] tabular-nums text-muted-foreground">
                {fmt(r.createdAt)}
              </td>
              <td className="px-3 py-2.5 align-top">
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
    </div>
  );
}

function CommentsTable({
  rows,
  loading,
  onUpdateStatus,
  onHardDelete,
  onViewReports,
}: {
  rows: AdminCommentListItem[];
  loading: boolean;
  onUpdateStatus: (id: string, s: "published" | "hidden" | "deleted") => void;
  onHardDelete: (id: string) => void;
  onViewReports: (id: string) => void;
}) {
  if (loading && rows.length === 0) {
    return <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-muted-foreground">{`// `}로딩 중…</p>;
  }
  if (rows.length === 0) {
    return (
      <div className="border-2 border-border bg-muted p-12 text-center font-mono text-[12px] uppercase tracking-[0.22em] text-muted-foreground">
        {`// `}조건에 맞는 댓글이 없습니다.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto border-2 border-border">
      <table className="w-full text-sm">
        <thead className="bg-foreground text-primary">
          <tr>
            {["상태", "댓글", "원본 게시글", "작성자", "신고", "작성", "관리"].map(
              (h) => (
                <th
                  key={h}
                  className="px-3 py-2.5 text-left font-mono text-[10px] font-bold uppercase tracking-[0.22em] border-r-2 border-border last:border-r-0"
                >
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t-2 border-border">
              <td className="px-3 py-2.5 align-top">
                <StatusBadge status={r.status} />
              </td>
              <td className="px-3 py-2.5 align-top">
                <p className="line-clamp-3 text-sm text-foreground">{r.body}</p>
              </td>
              <td className="px-3 py-2.5 align-top">
                <a
                  href={`/ko/community/posts/${r.postId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="line-clamp-2 font-mono text-[11px] tracking-tight text-primary hover:text-foreground"
                >
                  {r.postTitle}
                </a>
              </td>
              <td className="px-3 py-2.5 align-top">
                <p className="font-mono text-[11px] text-foreground">
                  {r.isAnonymous ? "익명" : r.authorName}
                </p>
                {r.authorIp ? (
                  <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                    IP {r.authorIp}
                  </p>
                ) : null}
              </td>
              <td className="px-3 py-2.5 align-top text-center">
                <span
                  className={`font-mono text-sm font-bold tabular-nums ${
                    r.reportCount > 0 ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {r.reportCount}
                </span>
              </td>
              <td className="px-3 py-2.5 align-top font-mono text-[11px] tabular-nums text-muted-foreground">
                {fmt(r.createdAt)}
              </td>
              <td className="px-3 py-2.5 align-top">
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
    </div>
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
      className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/60 p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[80vh] w-full max-w-2xl flex-col border-2 border-border bg-card">
        <div className="flex items-center justify-between border-b-2 border-border bg-foreground px-5 py-3">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
            [ {targetType === "post" ? "게시글" : "댓글"} 신고 사유 ]
          </p>
          <button
            type="button"
            onClick={onClose}
            className="text-primary-foreground hover:text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-muted-foreground">
              {`// `}로딩 중…
            </p>
          ) : error ? (
            <p className="border-2 border-primary bg-card px-3 py-2 font-mono text-[11px] tracking-tight text-primary">
              {`// `}
              {error}
            </p>
          ) : reports.length === 0 ? (
            <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-muted-foreground">
              {`// `}신고 기록이 없습니다.
            </p>
          ) : (
            <ul className="space-y-0">
              {reports.map((r) => (
                <li
                  key={r.id}
                  className="-mt-[2px] border-2 border-border bg-card p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    <span className="tabular-nums">{fmt(r.createdAt)}</span>
                    <span>
                      {r.reporterIp ? `IP ${r.reporterIp}` : ""}
                      {r.reporterUserId ? ` · 사용자 ${r.reporterUserId.slice(0, 8)}` : ""}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                    {r.reason}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter, Link } from "@/i18n/navigation";
import { User } from "lucide-react";
import { RoleBadge } from "@/components/community/role-badge";
import { COMMUNITY_LIMITS, type CommunityCommentItem } from "@/lib/community/types";

type Props = {
  comment: CommunityCommentItem;
  postId: string;
  locale: string;
  onSaveComment?: (
    commentId: string,
    content: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  onDeleteComment?: (
    commentId: string,
  ) => Promise<{ ok: boolean; error?: string }>;
};

function fmtRelative(iso: string, locale: string) {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const min = Math.floor(diff / 60_000);
  if (locale === "ko") {
    if (min < 1) return "방금 전";
    if (min < 60) return `${min}분 전`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}시간 전`;
    const day = Math.floor(hr / 24);
    if (day < 30) return `${day}일 전`;
    return date.toLocaleDateString("ko-KR");
  }
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return date.toLocaleDateString("en-US");
}

export function CommunityCommentItemCard({
  comment,
  postId,
  locale,
  onSaveComment,
  onDeleteComment,
}: Props) {
  const router = useRouter();
  const isKo = locale === "ko";
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(comment.body);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canSubmit =
    value.trim().length >= COMMUNITY_LIMITS.COMMENT_BODY_MIN &&
    value.trim().length <= COMMUNITY_LIMITS.COMMENT_BODY_MAX &&
    !busy;

  const handleSave = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const content = value.trim();
      if (onSaveComment) {
        const result = await onSaveComment(comment.id, content);
        if (!result.ok) {
          setError(
            result.error ||
              (isKo ? "댓글을 수정하지 못했습니다." : "Failed to update comment."),
          );
          return;
        }
        setEditing(false);
        return;
      }

      const res = await fetch(
        `/api/community/posts/${postId}/comments/${comment.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        },
      );
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        comment?: {
          id: string;
          content: string;
          createdAt: string;
          authorName: string;
          author: {
            id: string;
            name: string;
            company: string | null;
            role: "ADVERTISER" | "MEDIA" | "AGENCY" | "FREELANCER" | null;
            bio: string | null;
            region?: string | null;
          } | null;
        };
      };
      if (!res.ok || !data.ok) {
        setError(data.error || (isKo ? "댓글을 수정하지 못했습니다." : "Failed to update comment."));
        return;
      }
      setEditing(false);
      router.refresh();
    } catch {
      setError(isKo ? "네트워크 오류가 발생했습니다." : "A network error occurred.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (busy) return;
    const confirmed = window.confirm(
      isKo ? "이 댓글을 삭제할까요?" : "Delete this comment?",
    );
    if (!confirmed) return;

    setBusy(true);
    setError(null);
    try {
      if (onDeleteComment) {
        const result = await onDeleteComment(comment.id);
        if (!result.ok) {
          setError(
            result.error ||
              (isKo ? "댓글을 삭제하지 못했습니다." : "Failed to delete comment."),
          );
          return;
        }
        return;
      }

      const res = await fetch(
        `/api/community/posts/${postId}/comments/${comment.id}`,
        {
          method: "DELETE",
        },
      );
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || (isKo ? "댓글을 삭제하지 못했습니다." : "Failed to delete comment."));
        return;
      }
      router.refresh();
    } catch {
      setError(isKo ? "네트워크 오류가 발생했습니다." : "A network error occurred.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="rounded-[24px] border dark:border-white/12 border-gray-200 dark:bg-black bg-white bg-white/20 p-5 backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] dark:text-white">
          <User className="h-3.5 w-3.5 dark:text-white" />
          {comment.author ? (
            <Link
              href={`/community/profile/${comment.author.id}`}
              className="font-bold dark:text-white text-gray-900 transition-colors hover:dark:text-white text-gray-700"
            >
              {comment.authorName}
            </Link>
          ) : (
            <span className="font-bold dark:text-white text-gray-900">{comment.authorName}</span>
          )}
          <RoleBadge role={comment.author?.role ?? null} locale={locale} />
          <span className="tabular-nums">{fmtRelative(comment.createdAt, locale)}</span>
        </div>

        {comment.editableByMe ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setEditing((prev) => !prev);
                setValue(comment.body);
                setError(null);
              }}
              className="inline-flex rounded-full border dark:border-white/12 border-gray-200 dark:bg-white/6 bg-gray-50 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] dark:text-white text-gray-700 transition-colors hover:dark:bg-white/10 bg-gray-100"
            >
              {editing ? (isKo ? "취소" : "Cancel") : isKo ? "수정" : "Edit"}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className="inline-flex rounded-full border border-rose-400/35 bg-[rgba(127,29,29,0.24)] px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-rose-200 transition-colors hover:bg-[rgba(127,29,29,0.34)] disabled:opacity-60"
            >
              {isKo ? "삭제" : "Delete"}
            </button>
          </div>
        ) : null}
      </div>

      {editing ? (
        <div className="mt-4 space-y-3">
          <textarea
            value={value}
            onChange={(event) => setValue(event.target.value)}
            rows={4}
            maxLength={COMMUNITY_LIMITS.COMMENT_BODY_MAX}
            className="w-full resize-none rounded-[20px] border dark:border-white/12 border-gray-200 dark:bg-white/6 bg-gray-50 px-4 py-3 text-sm dark:text-white text-gray-900 placeholder:dark:text-white focus:border-white/22 focus:outline-none"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-[10px] tabular-nums dark:text-white">
              {value.length} / {COMMUNITY_LIMITS.COMMENT_BODY_MAX}
            </p>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSubmit}
              className="inline-flex rounded-full border border-[#8B5CF6]/55 bg-[linear-gradient(135deg,rgba(139,92,246,0.26),rgba(59,130,246,0.16))] px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] dark:text-white text-gray-900 transition-colors hover:dark:bg-white/10 bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? (isKo ? "저장 중…" : "Saving…") : isKo ? "저장" : "Save"}
            </button>
          </div>
          {error ? (
            <p className="rounded-2xl border border-rose-400/35 bg-[rgba(127,29,29,0.24)] px-3 py-2 font-mono text-[11px] tracking-tight text-rose-200">
              {`// `}
              {error}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed dark:text-white">
          {comment.body}
        </p>
      )}

      {!editing && error ? (
        <p className="mt-3 rounded-2xl border border-rose-400/35 bg-[rgba(127,29,29,0.24)] px-3 py-2 font-mono text-[11px] tracking-tight text-rose-200">
          {`// `}
          {error}
        </p>
      ) : null}
    </li>
  );
}

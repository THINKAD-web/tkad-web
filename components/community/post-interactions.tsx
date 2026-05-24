"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Bookmark, Flag, Heart, X } from "lucide-react";

type Props = {
  postId: string;
  locale: string;
  loginHref: string;
  canInteract: boolean;
  initialLikeCount: number;
  initialLiked: boolean;
  initialBookmarked: boolean;
};

export function CommunityPostInteractions({
  postId,
  locale,
  loginHref,
  canInteract,
  initialLikeCount,
  initialLiked,
  initialBookmarked,
}: Props) {
  const router = useRouter();
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [liked, setLiked] = useState(initialLiked);
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [likeBusy, setLikeBusy] = useState(false);
  const [bookmarkBusy, setBookmarkBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const goLoginIfNeeded = () => {
    if (!canInteract) {
      router.push(loginHref);
      return true;
    }
    return false;
  };

  const handleLike = async () => {
    if (likeBusy || liked) return;
    if (goLoginIfNeeded()) return;
    setLikeBusy(true);
    try {
      const res = await fetch(`/api/community/posts/${postId}/like`, {
        method: "POST",
      });
      if (res.status === 401) {
        router.push(loginHref);
        return;
      }
      const data = (await res.json()) as { ok?: boolean; alreadyLiked?: boolean };
      if (data.ok) {
        setLiked(true);
        if (!data.alreadyLiked) setLikeCount((n) => n + 1);
      }
    } finally {
      setLikeBusy(false);
    }
  };

  const handleBookmark = async () => {
    if (bookmarkBusy) return;
    if (goLoginIfNeeded()) return;
    setBookmarkBusy(true);
    try {
      const res = await fetch(`/api/community/posts/${postId}/bookmark`, {
        method: "POST",
      });
      if (res.status === 401) {
        router.push(loginHref);
        return;
      }
      const data = (await res.json()) as { ok?: boolean; active?: boolean };
      if (data.ok) setBookmarked(!!data.active);
    } finally {
      setBookmarkBusy(false);
    }
  };

  const isKo = locale === "ko";

  return (
    <>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={handleLike}
          disabled={likeBusy || liked}
          className={`inline-flex items-center gap-2 rounded-full border px-5 py-2.5 font-display text-xs font-medium uppercase tracking-[0.22em] transition-colors disabled:opacity-60 ${
            liked
              ? "border-[#8b5cf6]/55 bg-[linear-gradient(135deg,rgba(168,85,247,0.28),rgba(34,211,238,0.18))] dark:text-white text-gray-900"
              : "dark:border-white/12 border-gray-200 dark:bg-white/6 bg-gray-50 dark:text-white hover:dark:bg-white/10 bg-gray-100"
          }`}
        >
          <Heart
            className={`h-3.5 w-3.5 ${liked ? "fill-current" : ""}`}
            strokeWidth={2}
          />
          {isKo ? "좋아요" : "Like"} <span className="tabular-nums">{likeCount}</span>
        </button>
        <button
          type="button"
          onClick={handleBookmark}
          disabled={bookmarkBusy}
          className={`inline-flex items-center gap-2 rounded-full border px-5 py-2.5 font-display text-xs font-medium uppercase tracking-[0.22em] transition-colors disabled:opacity-60 ${
            bookmarked
              ? "border-[#8b5cf6]/55 bg-[linear-gradient(135deg,rgba(168,85,247,0.28),rgba(34,211,238,0.18))] dark:text-white text-gray-900"
              : "dark:border-white/12 border-gray-200 dark:bg-white/6 bg-gray-50 dark:text-white hover:dark:bg-white/10 bg-gray-100"
          }`}
        >
          <Bookmark
            className={`h-3.5 w-3.5 ${bookmarked ? "fill-current" : ""}`}
            strokeWidth={2}
          />
          {isKo ? "북마크" : "Bookmark"}
        </button>
        <button
          type="button"
          onClick={() => {
            if (goLoginIfNeeded()) return;
            setReportOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-full border dark:border-white/12 border-gray-200 dark:bg-black bg-white/20 px-5 py-2.5 font-display text-xs font-medium uppercase tracking-[0.22em] dark:text-white text-gray-700 transition-colors hover:dark:bg-white/10 bg-gray-100 hover:dark:text-white text-gray-900"
        >
          <Flag className="h-3.5 w-3.5" />
          {isKo ? "신고" : "Report"}
        </button>
      </div>

      {reportOpen ? (
        <ReportModal
          locale={locale}
          targetType="post"
          targetId={postId}
          loginHref={loginHref}
          onClose={() => setReportOpen(false)}
        />
      ) : null}
    </>
  );
}

export function ReportModal({
  locale,
  targetType,
  targetId,
  loginHref,
  onClose,
}: {
  locale: string;
  targetType: "post" | "comment";
  targetId: string;
  loginHref: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ autoHidden: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isKo = locale === "ko";

  const handleSubmit = async () => {
    if (busy) return;
    if (reason.trim().length < 5) {
      setError(
        isKo
          ? "신고 사유는 5자 이상 입력해주세요."
          : "Please enter at least 5 characters.",
      );
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const url =
        targetType === "post"
          ? `/api/community/posts/${targetId}/report`
          : `/api/community/comments/${targetId}/report`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        autoHidden?: boolean;
        error?: string;
      };
      if (res.status === 401) {
        router.push(loginHref);
        return;
      }
      if (!res.ok) {
        setError(data.error || (isKo ? "신고를 처리하지 못했습니다." : "Failed to submit report."));
        return;
      }
      setDone({ autoHidden: !!data.autoHidden });
    } catch {
      setError(isKo ? "네트워크 오류가 발생했습니다." : "A network error occurred.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/40 dark:bg-[#05050a]/72 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-[28px] border dark:border-white/12 border-gray-200 bg-white dark:bg-[#090912]/92 shadow-[0_40px_140px_rgba(0,0,0,0.82)] backdrop-blur tkad-neon-border">
        <div className="flex items-center justify-between border-b dark:border-white/10 border-gray-200 px-5 py-4">
          <p className="font-display text-xs font-medium uppercase tracking-[0.22em] dark:text-white">
            [ {targetType === "post" ? (isKo ? "게시글 신고" : "Report post") : isKo ? "댓글 신고" : "Report comment"} ]
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label={isKo ? "닫기" : "Close"}
            className="dark:text-white transition-colors hover:dark:text-white text-gray-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {done ? (
          <div className="p-6">
            <p className="font-display text-xs font-medium uppercase tracking-[0.22em] dark:text-white">
              [ {isKo ? "신고 접수" : "Report submitted"} ]
            </p>
            <p className="mt-3 text-sm dark:text-white">
              {done.autoHidden
                ? isKo
                  ? "신고가 누적되어 자동 숨김 처리되었습니다. 어드민 검토 후 결정됩니다."
                  : "The content has been auto-hidden pending admin review."
                : isKo
                  ? "신고가 접수되었습니다. 운영진이 검토합니다."
                  : "Your report has been submitted for review."}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 inline-flex w-full items-center justify-center rounded-full border dark:border-white/12 border-gray-200 dark:bg-white/6 bg-gray-50 px-5 py-3 font-display text-xs font-medium uppercase tracking-[0.22em] dark:text-white text-gray-900 transition-colors hover:dark:bg-white/10 bg-gray-100"
            >
              {isKo ? "확인" : "Close"}
            </button>
          </div>
        ) : (
          <div className="p-5">
            <label className="block">
              <span className="font-display text-xs font-medium uppercase tracking-[0.22em] dark:text-white text-gray-500">
                [ {isKo ? "신고 사유" : "Reason"} ]
              </span>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={5}
                placeholder={
                  isKo
                    ? "구체적인 사유를 입력해주세요 (5-500자)"
                    : "Tell us what happened (5-500 chars)"
                }
                className="mt-2 w-full resize-none rounded-[20px] border dark:border-white/12 border-gray-200 dark:bg-white/6 bg-gray-50 px-4 py-3 text-sm dark:text-white text-gray-900 placeholder:dark:text-white focus:border-white/22 focus:outline-none"
                maxLength={500}
              />
              <p className="mt-1 text-right text-[10px] tabular-nums dark:text-white">
                {reason.length} / 500
              </p>
            </label>
            {error ? (
              <p className="mt-3 rounded-2xl border border-rose-400/35 bg-[rgba(127,29,29,0.24)] px-3 py-2 text-[11px] tracking-tight text-rose-200">
                {`// `}
                {error}
              </p>
            ) : null}
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-full border dark:border-white/12 border-gray-200 dark:bg-white/6 bg-gray-50 px-5 py-3 font-display text-xs font-medium uppercase tracking-[0.22em] dark:text-white text-gray-900 transition-colors hover:dark:bg-white/10 bg-gray-100"
              >
                {isKo ? "취소" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={busy}
                className="flex-1 rounded-full border border-[#8b5cf6]/55 bg-[linear-gradient(135deg,rgba(168,85,247,0.26),rgba(34,211,238,0.16))] px-5 py-3 font-display text-xs font-medium uppercase tracking-[0.22em] dark:text-white text-gray-900 transition-colors hover:dark:bg-white/10 bg-gray-100 disabled:opacity-60"
              >
                {busy ? (isKo ? "처리 중…" : "Submitting…") : isKo ? "신고 접수" : "Submit"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

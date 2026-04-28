"use client";

import { useState } from "react";
import { Heart, Flag, X } from "lucide-react";

type Props = {
  postId: string;
  initialLikeCount: number;
};

/**
 * 좋아요 + 신고 버튼 (server detail 페이지 하단).
 * 좋아요는 1회만 (서버에서 unique 제약). 신고는 모달.
 */
export function CommunityPostInteractions({ postId, initialLikeCount }: Props) {
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [liked, setLiked] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const handleLike = async () => {
    if (likeBusy || liked) return;
    setLikeBusy(true);
    try {
      const res = await fetch(`/api/community/posts/${postId}/like`, {
        method: "POST",
      });
      const data = (await res.json()) as { ok: boolean; alreadyLiked?: boolean };
      if (data.ok) {
        setLiked(true);
        if (!data.alreadyLiked) setLikeCount((n) => n + 1);
      }
    } catch {
      /* 네트워크 에러 — silently */
    } finally {
      setLikeBusy(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={handleLike}
          disabled={likeBusy || liked}
          className={`inline-flex items-center gap-2 border-2 px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.22em] transition-colors disabled:opacity-60 ${
            liked
              ? "border-bx-accent bg-bx-accent text-bx-white"
              : "border-bx-black bg-bx-white text-bx-black hover:bg-bx-black hover:text-bx-white"
          }`}
        >
          <Heart
            className={`h-3.5 w-3.5 ${liked ? "fill-current" : ""}`}
            strokeWidth={2}
          />
          좋아요{" "}
          <span className="tabular-nums">{likeCount}</span>
        </button>
        <button
          type="button"
          onClick={() => setReportOpen(true)}
          className="inline-flex items-center gap-2 border-2 border-bx-black bg-bx-white px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-black transition-colors hover:bg-bx-black hover:text-bx-white"
        >
          <Flag className="h-3.5 w-3.5" />
          신고
        </button>
      </div>

      {reportOpen ? (
        <ReportModal
          targetType="post"
          targetId={postId}
          onClose={() => setReportOpen(false)}
        />
      ) : null}
    </>
  );
}

export function ReportModal({
  targetType,
  targetId,
  onClose,
}: {
  targetType: "post" | "comment";
  targetId: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ autoHidden: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (busy) return;
    if (reason.trim().length < 5) {
      setError("신고 사유는 5자 이상 입력해주세요.");
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
      if (!res.ok) {
        setError(data.error || "신고를 처리하지 못했습니다.");
        return;
      }
      setDone({ autoHidden: !!data.autoHidden });
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-bx-black/60 p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md border-2 border-bx-black bg-bx-white">
        <div className="flex items-center justify-between border-b-2 border-bx-black bg-bx-black px-5 py-3">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-accent">
            [ {targetType === "post" ? "게시글 신고" : "댓글 신고"} ]
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="text-bx-white hover:text-bx-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {done ? (
          <div className="p-6">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-accent">
              [ 신고 접수 ]
            </p>
            <p className="mt-3 text-sm text-bx-black">
              {done.autoHidden
                ? "신고가 누적되어 게시물이 자동 숨김 처리되었습니다. 어드민 검토 후 결정됩니다."
                : "신고가 접수되었습니다. 어드민이 24시간 내 검토합니다."}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 inline-flex w-full items-center justify-center border-2 border-bx-black bg-bx-black px-5 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-white"
            >
              확인
            </button>
          </div>
        ) : (
          <div className="p-5">
            <label className="block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                [ 신고 사유 ]
              </span>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={5}
                placeholder="구체적인 사유를 입력해주세요 (5-500자)"
                className="mt-2 w-full resize-none border-2 border-bx-black bg-bx-white px-3 py-2 font-mono text-sm text-bx-black placeholder:text-bx-gray-dim focus:border-bx-accent focus:outline-none"
                maxLength={500}
              />
              <p className="mt-1 text-right font-mono text-[10px] tabular-nums text-bx-gray-dim">
                {reason.length} / 500
              </p>
            </label>
            {error ? (
              <p className="mt-3 border-2 border-bx-accent bg-bx-white px-3 py-2 font-mono text-[11px] tracking-tight text-bx-accent">
                {`// `}
                {error}
              </p>
            ) : null}
            <div className="mt-5 flex gap-0">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 border-2 border-bx-black bg-bx-white px-5 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-black hover:bg-bx-off"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={busy}
                className="-ml-[2px] flex-1 border-2 border-bx-accent bg-bx-accent px-5 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-white transition-colors hover:bg-bx-black hover:border-bx-black disabled:opacity-60"
              >
                {busy ? "처리 중…" : "신고 접수"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

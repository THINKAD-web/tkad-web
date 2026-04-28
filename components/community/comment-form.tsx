"use client";

import { useState } from "react";
import { TurnstileWidget } from "@/components/turnstile";
import { useRouter } from "@/i18n/navigation";

type Props = {
  postId: string;
};

/**
 * 게시글 상세 페이지의 댓글 작성 폼.
 * Turnstile 토큰 + 익명 / 이름 / 본문.
 *
 * 가입 사용자: 자동으로 가입 사용자 정보 사용 (익명 체크해제 시).
 * 익명 사용자: "익명" 또는 입력한 이름.
 */
export function CommunityCommentForm({ postId }: Props) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const turnstileEnabled = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const canSubmit =
    body.trim().length >= 2 &&
    !busy &&
    (turnstileEnabled ? turnstileToken.length > 0 : true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/community/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body,
          authorName: authorName || (isAnonymous ? "익명" : ""),
          isAnonymous,
          turnstileToken,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || "댓글을 저장하지 못했습니다.");
        return;
      }
      // refresh — 새 댓글이 서버 렌더에 포함되도록
      setBody("");
      setAuthorName("");
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
        [ 댓글 작성 ]
      </p>

      <label className="block">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          placeholder="댓글을 남겨주세요. (2-2000자)"
          className="w-full resize-none border-2 border-bx-black bg-bx-white px-3 py-3 text-sm text-bx-black placeholder:text-bx-gray-dim focus:border-bx-accent focus:outline-none"
          maxLength={2000}
          required
        />
        <p className="mt-1 text-right font-mono text-[10px] tabular-nums text-bx-gray-dim">
          {body.length} / 2000
        </p>
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-bx-black">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            className="h-4 w-4 border-2 border-bx-black"
          />
          익명으로 작성
        </label>
        {!isAnonymous ? (
          <input
            type="text"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="작성자 이름"
            maxLength={50}
            className="flex-1 min-w-[180px] border-2 border-bx-black bg-bx-white px-3 py-2 font-mono text-sm text-bx-black placeholder:text-bx-gray-dim focus:border-bx-accent focus:outline-none"
          />
        ) : null}
      </div>

      {turnstileEnabled ? (
        <TurnstileWidget onVerify={setTurnstileToken} />
      ) : null}

      {error ? (
        <p className="border-2 border-bx-accent bg-bx-white px-3 py-2 font-mono text-[11px] tracking-tight text-bx-accent">
          {`// `}
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!canSubmit}
        className="inline-flex items-center gap-2 border-2 border-bx-accent bg-bx-accent px-6 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-white transition-colors hover:bg-bx-black hover:border-bx-black disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {busy ? "전송 중…" : "댓글 등록"}
      </button>
    </form>
  );
}

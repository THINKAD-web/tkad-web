"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import {
  COMMUNITY_LIMITS,
  fallbackCommunityRoleFromAppRole,
  normalizeCommunityMemberRole,
} from "@/lib/community/types";
import { CommunityRoleBadge } from "@/components/community/role-badge";

type Props = {
  postId: string;
  locale: string;
  currentUser: {
    name: string;
    company: string | null;
    role: string;
    communityRole: string | null;
  };
  onSubmitComment?: (content: string) => Promise<{ ok: boolean; error?: string }>;
};

export function CommunityCommentForm({
  postId,
  locale,
  currentUser,
  onSubmitComment,
}: Props) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const memberRole =
    normalizeCommunityMemberRole(currentUser.communityRole) ??
    fallbackCommunityRoleFromAppRole(currentUser.role);
  const canSubmit =
    body.trim().length >= COMMUNITY_LIMITS.COMMENT_BODY_MIN &&
    body.trim().length <= COMMUNITY_LIMITS.COMMENT_BODY_MAX &&
    !busy;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const content = body.trim();
      if (onSubmitComment) {
        const result = await onSubmitComment(content);
        if (!result.ok) {
          setError(result.error || "댓글을 저장하지 못했습니다.");
          return;
        }
        setBody("");
        return;
      }

      const res = await fetch(`/api/community/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
        }),
      });
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
          } | null;
        };
      };
      if (!res.ok || !data.ok) {
        setError(data.error || "댓글을 저장하지 못했습니다.");
        return;
      }
      setBody("");
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/55">
        [ 댓글 작성 ]
      </p>

      <div className="flex flex-wrap items-center gap-2 rounded-[20px] border border-white/12 bg-white/6 px-4 py-3 backdrop-blur tkad-neon-border">
        <span className="font-bold text-white">{currentUser.name}</span>
        <CommunityRoleBadge role={memberRole} locale={locale} />
        {currentUser.company ? (
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/58">
            {currentUser.company}
          </span>
        ) : null}
      </div>

      <label className="block">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          placeholder={`댓글을 남겨주세요. (${COMMUNITY_LIMITS.COMMENT_BODY_MIN}-${COMMUNITY_LIMITS.COMMENT_BODY_MAX}자)`}
          className="w-full resize-none rounded-[22px] border border-white/12 bg-white/6 px-4 py-3 text-sm text-white placeholder:text-white/38 focus:border-white/22 focus:outline-none"
          maxLength={COMMUNITY_LIMITS.COMMENT_BODY_MAX}
          required
        />
        <p className="mt-1 text-right font-mono text-[10px] tabular-nums text-white/46">
          {body.length} / {COMMUNITY_LIMITS.COMMENT_BODY_MAX}
        </p>
      </label>

      {error ? (
        <p className="rounded-2xl border border-rose-400/35 bg-[rgba(127,29,29,0.24)] px-3 py-2 font-mono text-[11px] tracking-tight text-rose-200">
          {`// `}
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!canSubmit}
        className="inline-flex items-center gap-2 rounded-full border border-[#8b5cf6]/55 bg-[linear-gradient(135deg,rgba(168,85,247,0.26),rgba(34,211,238,0.16))] px-6 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "전송 중…" : "댓글 등록"}
      </button>
    </form>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import {
  COMMUNITY_CATEGORIES,
  COMMUNITY_CATEGORY_LABELS,
  COMMUNITY_LIMITS,
  fallbackCommunityRoleFromAppRole,
  normalizeCommunityMemberRole,
  type CommunityCategory,
} from "@/lib/community/types";
import { Send } from "lucide-react";
import { RoleBadge } from "@/components/community/role-badge";

type Props = {
  locale: string;
  currentUser: {
    name: string;
    company: string | null;
    role: string;
    communityRole: string | null;
  };
};

export function CommunityWriteForm({ locale, currentUser }: Props) {
  const router = useRouter();
  const [category, setCategory] = useState<CommunityCategory>("qna");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const memberRole =
    normalizeCommunityMemberRole(currentUser.communityRole) ??
    fallbackCommunityRoleFromAppRole(currentUser.role);

  const titleOk =
    title.trim().length > 0 &&
    title.trim().length <= COMMUNITY_LIMITS.POST_TITLE_MAX;
  const bodyOk =
    body.trim().length >= COMMUNITY_LIMITS.POST_BODY_MIN &&
    body.trim().length <= COMMUNITY_LIMITS.POST_BODY_MAX;
  const canSubmit = titleOk && bodyOk && !busy;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          title: title.trim(),
          body: body.trim(),
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        id?: string;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.id) {
        setError(data.error || "글을 저장하지 못했습니다.");
        return;
      }
      router.push(`/community/post/${data.id}`);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-[26px] border border-white/12 bg-white/6 p-5 shadow-[0_28px_100px_rgba(0,0,0,0.55)] backdrop-blur tkad-neon-border">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/55">
          [ 작성자 ]
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-base font-bold text-white">
            {currentUser.name}
          </span>
          <RoleBadge role={memberRole} locale={locale} />
          {currentUser.company ? (
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/58">
              {currentUser.company}
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-sm leading-relaxed text-white/68">
          회원 프로필 기반으로 게시되며, 익명 작성은 지원하지 않습니다.
        </p>
      </div>

      <div>
        <label className="block">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/55">
            [ 카테고리 ]
          </span>
        </label>
        <div className="mt-3 flex flex-wrap gap-3">
          {COMMUNITY_CATEGORIES.map((cat) => {
            const labels = COMMUNITY_CATEGORY_LABELS[cat];
            const active = category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`inline-flex min-w-[150px] flex-col items-start gap-1 rounded-[20px] border px-4 py-3 text-left font-mono text-[11px] font-bold uppercase tracking-[0.22em] transition-colors ${
                  active
                    ? "border-[#8b5cf6]/55 bg-[linear-gradient(135deg,rgba(168,85,247,0.28),rgba(34,211,238,0.18))] text-white shadow-[0_18px_48px_rgba(99,102,241,0.22)]"
                    : "border-white/12 bg-white/6 text-white/88 hover:bg-white/10"
                }`}
              >
                <span>{labels.ko}</span>
                <span
                  className={`font-mono text-[9px] tracking-tight ${
                    active ? "text-white/70" : "text-white/48"
                  }`}
                  style={{ textTransform: "none", letterSpacing: 0 }}
                >
                  {labels.description.ko}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <label className="block">
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/55">
          [ 제목 ]
        </span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목을 입력해주세요"
          maxLength={COMMUNITY_LIMITS.POST_TITLE_MAX}
          required
          className="mt-3 w-full rounded-[22px] border border-white/12 bg-white/6 px-4 py-3 text-base font-bold text-white placeholder:text-white/38 focus:border-white/22 focus:outline-none"
        />
        <p className="mt-1 text-right font-mono text-[10px] tabular-nums text-white/46">
          {title.length} / {COMMUNITY_LIMITS.POST_TITLE_MAX}
        </p>
      </label>

      <label className="block">
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/55">
          [ 본문 ]
        </span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={12}
          placeholder={`본문을 입력해주세요. (${COMMUNITY_LIMITS.POST_BODY_MIN}-${COMMUNITY_LIMITS.POST_BODY_MAX.toLocaleString()}자)\n\n· 최근 진행한 캠페인 인사이트\n· 매체 운영이나 집행 관련 질문\n· 협업 파트너를 찾는 네트워킹 글\n· 성과와 시행착오를 정리한 후기`}
          maxLength={COMMUNITY_LIMITS.POST_BODY_MAX}
          required
          className="mt-3 w-full resize-y rounded-[24px] border border-white/12 bg-white/6 px-4 py-4 text-sm text-white placeholder:text-white/38 focus:border-white/22 focus:outline-none"
        />
        <p className="mt-1 text-right font-mono text-[10px] tabular-nums text-white/46">
          {body.length} / {COMMUNITY_LIMITS.POST_BODY_MAX.toLocaleString()}
        </p>
      </label>

      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="absolute opacity-0 pointer-events-none"
        aria-hidden
      />

      {error ? (
        <p className="rounded-2xl border border-rose-400/35 bg-[rgba(127,29,29,0.24)] px-4 py-3 font-mono text-[11px] tracking-tight text-rose-200">
          {`// `}
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex items-center gap-2 rounded-full border border-[#8b5cf6]/55 bg-[linear-gradient(135deg,rgba(168,85,247,0.26),rgba(34,211,238,0.16))] px-6 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="h-3.5 w-3.5" />
          {busy ? "전송 중…" : "글 등록"}
        </button>
      </div>
    </form>
  );
}

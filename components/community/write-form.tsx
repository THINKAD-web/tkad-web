"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { TurnstileWidget } from "@/components/turnstile";
import {
  COMMUNITY_CATEGORIES,
  COMMUNITY_CATEGORY_LABELS,
  COMMUNITY_LIMITS,
  type CommunityCategory,
} from "@/lib/community/types";
import { Send } from "lucide-react";

/**
 * 게시글 작성 폼.
 *
 * 카테고리 / 제목 / 본문 / 익명 / 작성자 이름 / 이메일 (선택) / Turnstile.
 * 성공 시 /community/posts/{id} 로 이동.
 */
export function CommunityWriteForm() {
  const router = useRouter();
  const [category, setCategory] = useState<CommunityCategory>("qa");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [authorName, setAuthorName] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Turnstile site key 가 있어도 운영 도메인 (tkad.co.kr) 이 아니면 우회.
  // Cloudflare 대시보드에 vercel.app preview 도메인이 등록 안 돼있어
  // 위젯이 토큰을 못 받는 경우 차단 회피. 서버도 verifyTurnstileForRequest 로 동일 정책.
  const isProductionDomain =
    typeof window !== "undefined" &&
    (window.location.hostname === "tkad.co.kr" ||
      window.location.hostname === "www.tkad.co.kr");
  const turnstileEnabled =
    isProductionDomain && !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const titleOk = title.trim().length > 0 && title.trim().length <= COMMUNITY_LIMITS.POST_TITLE_MAX;
  const bodyOk =
    body.trim().length >= COMMUNITY_LIMITS.POST_BODY_MIN &&
    body.trim().length <= COMMUNITY_LIMITS.POST_BODY_MAX;
  const turnstileOk = turnstileEnabled ? turnstileToken.length > 0 : true;
  const canSubmit = titleOk && bodyOk && turnstileOk && !busy;

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
          authorName: authorName.trim() || (isAnonymous ? "익명" : ""),
          authorEmail: authorEmail.trim() || undefined,
          isAnonymous,
          turnstileToken,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; id?: string; error?: string };
      if (!res.ok || !data.ok || !data.id) {
        setError(data.error || "글을 저장하지 못했습니다.");
        return;
      }
      router.push(`/community/posts/${data.id}`);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 카테고리 */}
      <div>
        <label className="block">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
            [ 카테고리 ]
          </span>
        </label>
        <div className="mt-3 flex flex-wrap gap-0">
          {COMMUNITY_CATEGORIES.map((cat) => {
            const labels = COMMUNITY_CATEGORY_LABELS[cat];
            const active = category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`-ml-[2px] inline-flex flex-col items-start gap-1 border-2 border-bx-black px-4 py-3 text-left font-mono text-[11px] font-bold uppercase tracking-[0.22em] transition-colors ${
                  active
                    ? "bg-bx-accent text-bx-white border-bx-accent"
                    : "bg-bx-white text-bx-black hover:bg-bx-black hover:text-bx-white"
                }`}
              >
                <span>{labels.ko}</span>
                <span
                  className={`font-mono text-[9px] tracking-tight ${
                    active ? "text-bx-white/70" : "text-bx-gray-dim"
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

      {/* 제목 */}
      <label className="block">
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
          [ 제목 ]
        </span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목을 입력해주세요"
          maxLength={COMMUNITY_LIMITS.POST_TITLE_MAX}
          required
          className="mt-3 w-full border-2 border-bx-black bg-bx-white px-3 py-3 text-base font-bold text-bx-black placeholder:text-bx-gray-dim focus:border-bx-accent focus:outline-none"
        />
        <p className="mt-1 text-right font-mono text-[10px] tabular-nums text-bx-gray-dim">
          {title.length} / {COMMUNITY_LIMITS.POST_TITLE_MAX}
        </p>
      </label>

      {/* 본문 */}
      <label className="block">
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
          [ 본문 ]
        </span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={12}
          placeholder={`본문을 입력해주세요. (${COMMUNITY_LIMITS.POST_BODY_MIN}-${COMMUNITY_LIMITS.POST_BODY_MAX.toLocaleString()}자)\n\n· 매체 / 단가에 대한 구체적 질문\n· 개인 후기 / 경험\n· 캠페인 목표 + 추천 요청\n등을 작성하면 다른 사용자의 답변을 받기 쉽습니다.`}
          maxLength={COMMUNITY_LIMITS.POST_BODY_MAX}
          required
          className="mt-3 w-full resize-y border-2 border-bx-black bg-bx-white px-3 py-3 text-sm text-bx-black placeholder:text-bx-gray-dim focus:border-bx-accent focus:outline-none"
        />
        <p className="mt-1 text-right font-mono text-[10px] tabular-nums text-bx-gray-dim">
          {body.length} / {COMMUNITY_LIMITS.POST_BODY_MAX.toLocaleString()}
        </p>
      </label>

      {/* 작성자 정보 */}
      <div className="border-2 border-bx-black bg-bx-off p-5 space-y-4">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
          [ 작성자 정보 ]
        </p>
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
          <label className="block">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-bx-gray-dim">
              작성자 이름
            </span>
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="홍길동"
              maxLength={COMMUNITY_LIMITS.AUTHOR_NAME_MAX}
              className="mt-1 w-full border-2 border-bx-black bg-bx-white px-3 py-2 font-mono text-sm text-bx-black placeholder:text-bx-gray-dim focus:border-bx-accent focus:outline-none"
            />
          </label>
        ) : null}
        <label className="block">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-bx-gray-dim">
            이메일 (선택, 답변 통보용 — 게시물에 노출 X)
          </span>
          {/*
            type="text" + inputMode="email" — Safari/iOS 가 type="email" 의
            기본 HTML5 검증으로 "The string did not match the expected pattern"
            을 띄우는 것 회피. 서버에서 lib/community/validate.ts 가 정식 검증.
          */}
          <input
            type="text"
            inputMode="email"
            autoComplete="email"
            value={authorEmail}
            onChange={(e) => setAuthorEmail(e.target.value)}
            placeholder="example@domain.com"
            className="mt-1 w-full border-2 border-bx-black bg-bx-white px-3 py-2 font-mono text-sm text-bx-black placeholder:text-bx-gray-dim focus:border-bx-accent focus:outline-none"
          />
        </label>
        <p className="font-mono text-[10px] tracking-tight text-bx-gray-dim">
          {`// `}
          IP 주소는 스팸 방지 목적으로 60일간 보관 후 자동 익명화됩니다.
        </p>
      </div>

      {/* honeypot — bot 차단 (사람에겐 안 보임) */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="absolute opacity-0 pointer-events-none"
        aria-hidden
      />

      {/* Turnstile */}
      {turnstileEnabled ? (
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
            [ 캡차 ]
          </p>
          <div className="mt-3">
            <TurnstileWidget onVerify={setTurnstileToken} />
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="border-2 border-bx-accent bg-bx-white px-4 py-3 font-mono text-[11px] tracking-tight text-bx-accent">
          {`// `}
          {error}
        </p>
      ) : null}

      {/* 제출 */}
      <div className="flex flex-wrap gap-0">
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex items-center gap-2 border-2 border-bx-accent bg-bx-accent px-6 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-white transition-colors hover:bg-bx-black hover:border-bx-black disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="h-3.5 w-3.5" />
          {busy ? "전송 중…" : "글 등록"}
        </button>
      </div>
    </form>
  );
}

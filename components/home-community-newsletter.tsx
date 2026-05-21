"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  isKo: boolean;
  className?: string;
};

export function HomeCommunityNewsletter({ isKo, className }: Props) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          locale: isKo ? "ko" : "en",
        }),
      });
      if (!res.ok) {
        setStatus("error");
        return;
      }
      setStatus("success");
      setEmail("");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div
      className={cn(
        "tkad-neon-border tkad-neon-glow relative overflow-hidden rounded-[28px] border dark:border-white/12 border-gray-200 bg-white/[0.04] p-5 dark:text-white text-gray-900 backdrop-blur sm:p-6",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-20 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.22),transparent_55%),radial-gradient(circle_at_bottom_left,rgba(236,72,153,0.18),transparent_55%)]"
      />
      <div className="relative">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] dark:text-white text-gray-600">
          {isKo ? "Newsletter" : "Newsletter"}
        </p>
        <h3 className="mt-2 font-sans text-lg font-bold tracking-tight dark:text-white text-gray-900 sm:text-xl">
          {isKo ? (
            <>
              OOH 업계 <span className="tkad-home-accent-text">뉴스레터</span> 구독
            </>
          ) : (
            <>
              <span className="tkad-home-accent-text">OOH</span> industry updates
            </>
          )}
        </h3>
        <p className="mt-2 text-sm leading-relaxed dark:text-white">
          {isKo
            ? "트렌드·매체 인사이트·커뮤니티 소식을 이메일로 받아보세요."
            : "Get trends, media insights, and community updates by email."}
        </p>

        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <label htmlFor="home-community-newsletter-email" className="sr-only">
            {isKo ? "이메일" : "Email"}
          </label>
          <input
            id="home-community-newsletter-email"
            type="email"
            name="email"
            required
            autoComplete="email"
            value={email}
            disabled={status === "loading" || status === "success"}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={isKo ? "work@company.com" : "work@company.com"}
            className="h-11 min-w-0 flex-1 rounded-full border dark:border-white/14 border-gray-200 dark:bg-black bg-white bg-white/35 px-4 font-mono text-sm font-semibold dark:text-white text-gray-900 placeholder:dark:text-white outline-none backdrop-blur transition-colors focus:border-white/22 focus:ring-2 focus:ring-[#a855f7]/30 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={status === "loading" || status === "success"}
            className="h-11 shrink-0 rounded-full border border-white/22 bg-[linear-gradient(135deg,rgba(168,85,247,0.95),rgba(34,211,238,0.95),rgba(236,72,153,0.95))] px-5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] dark:text-white text-gray-900 shadow-[0_14px_44px_rgba(0,0,0,0.5)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "loading"
              ? isKo
                ? "전송 중…"
                : "Sending…"
              : isKo
                ? "구독하기"
                : "Subscribe"}
          </button>
        </form>

        {status === "success" ? (
          <p className="mt-3 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
            {isKo ? "구독 신청이 접수되었습니다." : "Thanks — you’re on the list."}
          </p>
        ) : null}
        {status === "error" ? (
          <p className="mt-3 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-300">
            {isKo
              ? "전송에 실패했습니다. 잠시 후 다시 시도해 주세요."
              : "Could not submit. Please try again."}
          </p>
        ) : null}
      </div>
    </div>
  );
}

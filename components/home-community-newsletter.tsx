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
        "border-2 border-black bg-card p-5 text-card-foreground shadow-[4px_4px_0_0_rgb(0,0,0)] sm:p-6",
        className,
      )}
    >
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#FF6600]">
        {isKo ? "Newsletter" : "Newsletter"}
      </p>
      <h3 className="mt-2 font-sans text-lg font-bold tracking-tight text-foreground sm:text-xl">
        {isKo ? "OOH 업계 뉴스레터 구독" : "Subscribe to OOH industry updates"}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
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
          className="h-11 min-w-0 flex-1 border-2 border-black bg-background px-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6600] focus-visible:ring-offset-2"
        />
        <button
          type="submit"
          disabled={status === "loading" || status === "success"}
          className="h-11 shrink-0 border-2 border-black bg-[#FF6600] px-5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
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
        <p className="mt-3 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400">
          {isKo ? "구독 신청이 접수되었습니다." : "Thanks — you’re on the list."}
        </p>
      ) : null}
      {status === "error" ? (
        <p className="mt-3 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-destructive">
          {isKo
            ? "전송에 실패했습니다. 잠시 후 다시 시도해 주세요."
            : "Could not submit. Please try again."}
        </p>
      ) : null}
    </div>
  );
}

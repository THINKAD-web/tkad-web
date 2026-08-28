"use client";

import { Loader2 } from "lucide-react";
import { useLocale } from "next-intl";

/** Instant feedback while SupportAiChatModal chunk loads (dynamic import). */
export function SupportAiChatModalLoading() {
  const locale = useLocale();
  const isKo = locale === "ko";

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-busy="true"
      aria-label={isKo ? "AI 챗봇 불러오는 중" : "Loading AI chat"}
      data-screenshot="ai-chat-modal-loading"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" aria-hidden />
      <div className="relative z-10 flex w-full max-w-lg flex-col items-center gap-3 rounded-t-2xl border-t border-gray-200 bg-white px-8 py-10 dark:border-white/10 dark:bg-gray-950 sm:rounded-2xl sm:border sm:py-8">
        <Loader2
          className="h-8 w-8 animate-spin text-[color:var(--qp-accent)]"
          aria-hidden
        />
        <p className="text-sm font-medium text-gray-700 dark:text-white/80">
          {isKo ? "AI 챗봇 준비 중…" : "Loading AI chat…"}
        </p>
      </div>
    </div>
  );
}

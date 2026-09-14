"use client";

import { Loader2 } from "lucide-react";
import { useLocale } from "next-intl";

/**
 * Instant feedback while SupportAiChatModal chunk loads (dynamic import).
 *
 * v10 Task K — this MUST occupy the exact same box (position/size/z-index) as
 * the real `SupportAiChatModal` shell. It used to be a centered/bottom-sheet
 * `max-w-lg` dialog while the real modal is a small bottom-right corner card
 * on desktop and a `inset-x-3 bottom-3` sheet on mobile — two different
 * layouts. On mobile the dynamic-import chunk almost never finishes loading
 * before the tap (only `onTouchStart` prefetch, fired a beat before the
 * click), so this skeleton reliably rendered first, then got swapped for the
 * real modal at a different position/size — read as the chat window
 * "shaking"/jumping right after opening. Keep both shells pixel-identical so
 * the swap is a no-op layout-wise.
 */
export function SupportAiChatModalLoading() {
  const locale = useLocale();
  const isKo = locale === "ko";

  return (
    <div
      className="fixed inset-0 z-[54] bg-gray-500/50 dark:bg-white/5 sm:pointer-events-none sm:bg-transparent"
      role="presentation"
    >
      <div
        className="pointer-events-auto fixed inset-x-3 bottom-3 top-auto z-[56] mx-auto flex max-h-[min(560px,78dvh,82vh)] min-h-[360px] flex-col items-center justify-center gap-3 overflow-hidden rounded-[24px] border border-gray-200 bg-white text-gray-900 shadow-[0_28px_120px_rgba(0,0,0,0.7)] backdrop-blur dark:border-white/12 dark:bg-black dark:text-white sm:inset-x-auto sm:bottom-6 sm:left-auto sm:right-6 sm:mx-0 sm:w-[min(400px,calc(100vw-2rem))]"
        role="dialog"
        aria-modal="true"
        aria-busy="true"
        aria-label={isKo ? "AI 챗봇 불러오는 중" : "Loading AI chat"}
        data-screenshot="ai-chat-modal-loading"
      >
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

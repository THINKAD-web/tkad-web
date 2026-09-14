"use client";

import { Bot, MessageCircle, Phone } from "lucide-react";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { KAKAO_CHANNEL_PUBLIC_URL } from "@/lib/kakao-public";
import { prefetchSupportAiChatModal } from "@/lib/lazy-chunk-prefetch";
import { useContactChannelSheet } from "@/components/contact/contact-channel-provider";

const channelBase =
  "flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-semibold transition-ui";

/**
 * v10 Task 2 — "어떻게 문의하실건가요?" 채널 선택 팝업을 없애고, 빠른 채널을
 * `/contact` 페이지 안에 그대로 노출한다. AI 챗봇만 여전히 플로팅 위젯을 연다.
 */
export function QuickContactChannels() {
  const locale = useLocale();
  const isKo = locale === "ko";
  const { openAi } = useContactChannelSheet();

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <a
        href={KAKAO_CHANNEL_PUBLIC_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(channelBase, "bg-[#FEE500] text-gray-900 hover:brightness-95")}
      >
        <MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
        {isKo ? "카카오톡 상담" : "KakaoTalk chat"}
      </a>
      <button
        type="button"
        onPointerEnter={() => prefetchSupportAiChatModal()}
        onTouchStart={() => prefetchSupportAiChatModal()}
        onClick={() => {
          prefetchSupportAiChatModal();
          openAi();
        }}
        className={cn(
          channelBase,
          "border border-gray-200 bg-gray-50 text-gray-900 hover:bg-gray-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10",
        )}
      >
        <Bot className="h-4 w-4 shrink-0" aria-hidden />
        {isKo ? "AI 챗봇 상담" : "AI chatbot"}
      </button>
      <a
        href="tel:02-515-2772"
        className={cn(
          channelBase,
          "border border-gray-200 bg-gray-50 text-gray-900 hover:bg-gray-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10",
        )}
      >
        <Phone className="h-4 w-4 shrink-0" aria-hidden />
        {isKo ? "전화 상담" : "Phone support"}
      </a>
    </div>
  );
}

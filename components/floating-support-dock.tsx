"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { MessageCircle } from "lucide-react";
import { KAKAO_CHANNEL_PUBLIC_URL } from "@/lib/kakao-public";
import { usePageScrollEdges } from "@/lib/use-page-scroll-edges";
import { cn } from "@/lib/utils";
import { RecentlyViewedFloatingPanel } from "@/components/recently-viewed-floating-panel";
import {
  readRecentlyViewedRecords,
  subscribeRecentlyViewedChanged,
} from "@/lib/recently-viewed";

const SupportAiChatModal = dynamic(
  () =>
    import("@/components/support/support-ai-chat-modal").then(
      (m) => m.SupportAiChatModal,
    ),
  { ssr: false },
);

function KakaoTalkIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      fill="currentColor"
    >
      <path d="M12 3C6.477 3 2 6.477 2 10.8c0 2.742 1.815 5.146 4.545 6.52-.198.72-.717 2.606-.82 3.01-.13.52.19.512.398.372.165-.11 2.615-1.755 3.676-2.47.387.053.784.08 1.201.08 5.523 0 10-3.477 10-7.8S17.523 3 12 3z" />
    </svg>
  );
}

const desktopFabClass =
  "flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50";

export default function FloatingSupportDock() {
  const pathname = usePathname();
  const locale = useLocale();
  const isKo = locale === "ko";
  const tChat = useTranslations("supportChat");
  const [aiOpen, setAiOpen] = useState(false);
  const [hasRecent, setHasRecent] = useState(false);
  const { mounted } = usePageScrollEdges();

  const hidden =
    pathname.includes("/admin") ||
    pathname.includes("/login") ||
    pathname.includes("/register");

  useEffect(() => {
    setAiOpen(false);
  }, [pathname]);

  useEffect(() => {
    const refresh = () => setHasRecent(readRecentlyViewedRecords().length > 0);
    refresh();
    return subscribeRecentlyViewedChanged(refresh);
  }, []);

  if (hidden) return null;

  return (
    <>
      <SupportAiChatModal open={aiOpen} onClose={() => setAiOpen(false)} />

      {/* 모바일: 최근 본 매체 (퀵액션 바 위, 우측 플로팅) */}
      <div
        className={cn(
          "md:hidden",
          !mounted && "pointer-events-none opacity-0",
        )}
      >
        {hasRecent ? (
          <RecentlyViewedFloatingPanel className="fixed bottom-[7.25rem] right-4 z-50" />
        ) : null}
      </div>

      {/* 데스크탑: 최근 조회 + AI + 카카오 */}
      <div
        className={cn(
          "fixed bottom-6 right-4 z-50 hidden flex-col items-end gap-3 md:flex",
          !mounted && "pointer-events-none opacity-0",
        )}
        style={{
          bottom: "max(1.5rem, env(safe-area-inset-bottom, 0px))",
          right: "max(1rem, env(safe-area-inset-right, 0px))",
        }}
        aria-label={isKo ? "상담 버튼" : "Support buttons"}
      >
        {hasRecent ? (
          <RecentlyViewedFloatingPanel className="w-72" />
        ) : null}
        <button
          type="button"
          onClick={() => setAiOpen(true)}
          className={cn(
            desktopFabClass,
            "bg-gradient-to-br from-violet-500 to-cyan-400 text-white shadow-violet-500/30",
          )}
          aria-label={isKo ? "채팅 상담" : "Chat support"}
          title={isKo ? "채팅 상담" : "Chat support"}
        >
          <MessageCircle className="h-6 w-6" strokeWidth={2.25} />
        </button>

        <a
          href={KAKAO_CHANNEL_PUBLIC_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(desktopFabClass, "bg-[#FEE500] text-[#191600]")}
          aria-label={tChat("kakaoCta")}
          title={tChat("kakaoCta")}
        >
          <KakaoTalkIcon className="h-7 w-7" />
        </a>
      </div>
    </>
  );
}

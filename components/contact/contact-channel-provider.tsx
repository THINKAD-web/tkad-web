"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { SupportAiChatModalLoading } from "@/components/support/support-ai-chat-modal-loading";
import { useMobileChromeOverlayOptional } from "@/components/mobile/mobile-chrome-overlay-context";
import { prefetchOnIdle, prefetchSupportAiChatModal } from "@/lib/lazy-chunk-prefetch";

const SupportAiChatModal = dynamic(
  () =>
    import("@/components/support/support-ai-chat-modal").then(
      (m) => m.SupportAiChatModal,
    ),
  { ssr: false, loading: SupportAiChatModalLoading },
);

const OPEN_AI_EVENT = "tkad-open-ai-chat";

type ContactChannelContextValue = {
  openAi: () => void;
};

const ContactChannelContext = createContext<ContactChannelContextValue | null>(
  null,
);

/**
 * v10 Task 2 — "어떻게 문의하실건가요?" 채널 선택 팝업은 제거했다(모바일 하단
 * 탭 "문의" 는 이제 `/contact` 페이지로 바로 이동한다 — bottom-tab-bar.tsx).
 * AI 챗봇만 여전히 플로팅 위젯으로 열 수 있게 이 컨텍스트를 남겨 둔다
 * (데스크톱 사이드바 퀵액션, `/contact` 페이지의 빠른 상담 카드에서 사용).
 */
export function useContactChannelSheet() {
  const ctx = useContext(ContactChannelContext);
  if (!ctx) {
    return {
      openAi: () => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent(OPEN_AI_EVENT));
        }
      },
    };
  }
  return ctx;
}

export function ContactChannelProvider({ children }: { children: ReactNode }) {
  const [aiOpen, setAiOpen] = useState(false);
  const chromeOverlay = useMobileChromeOverlayOptional();

  /** 열려 있는 동안 BottomTabBar 를 숨긴다 — 안 하면 탭바(z-80)가 위젯 위로 그려진다. */
  useEffect(() => {
    if (!chromeOverlay) return;
    chromeOverlay.setOpen("contact-channel", aiOpen);
    return () => chromeOverlay.setOpen("contact-channel", false);
  }, [aiOpen, chromeOverlay]);

  useEffect(() => {
    const handler = () => {
      prefetchSupportAiChatModal();
      setAiOpen(true);
    };
    window.addEventListener(OPEN_AI_EVENT, handler);
    return () => window.removeEventListener(OPEN_AI_EVENT, handler);
  }, []);

  useEffect(() => {
    return prefetchOnIdle(() => prefetchSupportAiChatModal());
  }, []);

  const handleOpenAi = useCallback(() => {
    prefetchSupportAiChatModal();
    setAiOpen(true);
  }, []);

  return (
    <ContactChannelContext.Provider value={{ openAi: handleOpenAi }}>
      {children}
      {aiOpen ? (
        <SupportAiChatModal open={aiOpen} onClose={() => setAiOpen(false)} />
      ) : null}
    </ContactChannelContext.Provider>
  );
}

"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useLocale } from "next-intl";
import { X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { SupportAiChatModalLoading } from "@/components/support/support-ai-chat-modal-loading";
import { useMobileChromeOverlayOptional } from "@/components/mobile/mobile-chrome-overlay-context";
import { KAKAO_CHANNEL_PUBLIC_URL } from "@/lib/kakao-public";
import { prefetchOnIdle, prefetchSupportAiChatModal } from "@/lib/lazy-chunk-prefetch";
import { cn } from "@/lib/utils";

const SupportAiChatModal = dynamic(
  () =>
    import("@/components/support/support-ai-chat-modal").then(
      (m) => m.SupportAiChatModal,
    ),
  { ssr: false, loading: SupportAiChatModalLoading },
);

const OPEN_EVENT = "tkad-open-contact-sheet";
const OPEN_AI_EVENT = "tkad-open-ai-chat";

type ContactChannelContextValue = {
  open: () => void;
  close: () => void;
  openAi: () => void;
};

const ContactChannelContext = createContext<ContactChannelContextValue | null>(
  null,
);

export function useContactChannelSheet() {
  const ctx = useContext(ContactChannelContext);
  if (!ctx) {
    return {
      open: () => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent(OPEN_EVENT));
        }
      },
      close: () => {},
      openAi: () => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent(OPEN_AI_EVENT));
        }
      },
    };
  }
  return ctx;
}

export function openContactChannelSheet() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(OPEN_EVENT));
  }
}

function ContactChannelSheetUI({
  open,
  onClose,
  onOpenAi,
}: {
  open: boolean;
  onClose: () => void;
  onOpenAi: () => void;
}) {
  const locale = useLocale();
  const isKo = locale === "ko";

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // body 가 아니라 html 에 직접 건다 — body 에 걸면 CSS 가 이를 뷰포트로
    // "전파"하는데, 이 전파 경로에서 스크롤된 상태의 sticky/fixed 헤더가
    // 화면 밖으로 튕겨나가는 브라우저 버그가 있다 (데스크톱 글로벌 헤더 참고).
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      html.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px]"
        aria-label={isKo ? "닫기" : "Close"}
        onClick={onClose}
      />
      <div
        className={cn(
          "fixed z-[61] flex flex-col",
          "inset-0 pt-[env(safe-area-inset-top,0px)]",
          "bg-white dark:bg-gray-950",
          "p-6 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]",
          "md:inset-x-0 md:bottom-0 md:top-auto md:rounded-t-2xl md:border-t md:border-gray-200 md:dark:border-white/10 md:p-6",
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-channel-title"
        data-screenshot="contact-channel-sheet"
      >
        <div className="mb-6 flex shrink-0 items-start justify-between gap-3 md:mb-5">
          <div>
            <h2
              id="contact-channel-title"
              className="text-xl font-bold text-gray-900 md:text-lg dark:text-white"
            >
              {isKo ? "어떻게 문의하실건가요?" : "How would you like to contact us?"}
            </h2>
            <p className="mt-1.5 text-sm text-gray-500 md:mt-1 dark:text-white/60">
              {isKo ? "편한 방법으로 연락주세요" : "Choose the channel that works best for you"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label={isKo ? "닫기" : "Close"}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col justify-center gap-4 md:flex-none md:justify-start md:space-y-3 md:gap-0">
          <a
            href={KAKAO_CHANNEL_PUBLIC_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="flex w-full flex-col rounded-2xl bg-[#FEE500] px-5 py-5 text-left text-gray-900 transition hover:brightness-95 md:rounded-xl md:px-4 md:py-3.5"
          >
            <span className="text-base font-semibold md:text-sm">
              {isKo ? "💬 카카오톡 상담" : "💬 KakaoTalk chat"}
            </span>
            <span className="mt-1 text-sm opacity-80 md:mt-0.5 md:text-xs">
              {isKo ? "즉시 연결 · 평균 1시간 내 응답" : "Instant · avg. reply within 1 hour"}
            </span>
          </a>

          <button
            type="button"
            onPointerEnter={() => prefetchSupportAiChatModal()}
            onTouchStart={() => prefetchSupportAiChatModal()}
            onClick={() => {
              prefetchSupportAiChatModal();
              onClose();
              onOpenAi();
            }}
            className="flex w-full flex-col rounded-2xl bg-gray-100 px-5 py-5 text-left text-gray-900 transition hover:bg-gray-200 md:rounded-xl md:px-4 md:py-3.5 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
          >
            <span className="text-base font-semibold md:text-sm">
              {isKo ? "🤖 AI 챗봇 상담" : "🤖 AI chatbot"}
            </span>
            <span className="mt-1 text-sm opacity-70 md:mt-0.5 md:text-xs">
              {isKo ? "24시간 · 기본 문의 즉시 답변" : "24/7 · instant answers for common questions"}
            </span>
          </button>

          <Link
            href="/contact"
            onClick={onClose}
            className="flex w-full flex-col rounded-2xl bg-gradient-to-r from-violet-500 to-cyan-400 px-5 py-5 text-left text-white transition hover:opacity-95 md:rounded-xl md:px-4 md:py-3.5"
          >
            <span className="text-base font-semibold md:text-sm">
              {isKo ? "📋 견적 요청서" : "📋 Quote request form"}
            </span>
            <span className="mt-1 text-sm text-white/85 md:mt-0.5 md:text-xs">
              {isKo ? "상세 문의 · 24시간 내 담당자 연락" : "Detailed inquiry · reply within 24h"}
            </span>
          </Link>

          <a
            href="tel:02-515-2772"
            onClick={onClose}
            className="flex w-full flex-col rounded-2xl bg-gray-100 px-5 py-5 text-left text-gray-900 transition hover:bg-gray-200 md:rounded-xl md:px-4 md:py-3.5 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
          >
            <span className="text-base font-semibold md:text-sm">
              {isKo ? "📞 전화 상담" : "📞 Phone support"}
            </span>
            <span className="mt-1 text-sm opacity-70 md:mt-0.5 md:text-xs">
              {isKo ? "평일 09:00~18:00" : "Weekdays 09:00–18:00"}
            </span>
          </a>
        </div>
      </div>
    </>
  );
}

export function ContactChannelProvider({ children }: { children: ReactNode }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const chromeOverlay = useMobileChromeOverlayOptional();

  const open = useCallback(() => setSheetOpen(true), []);
  const close = useCallback(() => setSheetOpen(false), []);
  const openAi = useCallback(() => setAiOpen(true), []);

  /**
   * 열려 있는 동안 BottomTabBar 를 숨긴다. 안 하면 탭바(z-80)가 이 시트(z-61)
   * 보다 위에 그려져 마지막 항목("전화 상담")이 잘려 보인다.
   */
  useEffect(() => {
    if (!chromeOverlay) return;
    const anyOpen = sheetOpen || aiOpen;
    chromeOverlay.setOpen("contact-channel", anyOpen);
    return () => chromeOverlay.setOpen("contact-channel", false);
  }, [sheetOpen, aiOpen, chromeOverlay]);

  useEffect(() => {
    const handler = () => open();
    window.addEventListener(OPEN_EVENT, handler);
    return () => window.removeEventListener(OPEN_EVENT, handler);
  }, [open]);

  useEffect(() => {
    const handler = () => {
      prefetchSupportAiChatModal();
      openAi();
    };
    window.addEventListener(OPEN_AI_EVENT, handler);
    return () => window.removeEventListener(OPEN_AI_EVENT, handler);
  }, [openAi]);

  useEffect(() => {
    return prefetchOnIdle(() => prefetchSupportAiChatModal());
  }, []);

  const handleOpenAi = useCallback(() => {
    prefetchSupportAiChatModal();
    setAiOpen(true);
  }, []);

  return (
    <ContactChannelContext.Provider value={{ open, close, openAi: handleOpenAi }}>
      {children}
      <ContactChannelSheetUI
        open={sheetOpen}
        onClose={close}
        onOpenAi={handleOpenAi}
      />
      {aiOpen ? (
        <SupportAiChatModal open={aiOpen} onClose={() => setAiOpen(false)} />
      ) : null}
    </ContactChannelContext.Provider>
  );
}

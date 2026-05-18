"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Bot,
  ClipboardList,
  MessageCircle,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";
import { KAKAO_CHANNEL_PUBLIC_URL } from "@/lib/kakao-public";
import {
  FLOATING_SUPPORT_DOCK_BOTTOM,
  FLOATING_SUPPORT_DOCK_RIGHT,
} from "@/lib/floating-support-dock-layout";
import { cn } from "@/lib/utils";

const AiChatbot = dynamic(() => import("@/components/ai-chatbot"), { ssr: false });

const dockBtnBase =
  "relative flex h-11 w-full items-center justify-center rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/45";

export default function FloatingSupportDock() {
  const pathname = usePathname();
  const locale = useLocale();
  const isKo = locale === "ko";
  const tQuote = useTranslations("quoteFab");
  const tDock = useTranslations("supportDock");
  const tAi = useTranslations("aiChatbot");

  const [quoteOpen, setQuoteOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const quotePanelRef = useRef<HTMLDivElement>(null);

  const hidden =
    pathname.includes("/admin") ||
    pathname.includes("/login") ||
    pathname.includes("/register");

  useEffect(() => {
    if (!quoteOpen) return;
    function onDoc(e: MouseEvent) {
      if (!quotePanelRef.current?.contains(e.target as Node)) setQuoteOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [quoteOpen]);

  useEffect(() => {
    setQuoteOpen(false);
    setChatOpen(false);
  }, [pathname]);

  if (hidden) return null;

  const openQuote = () => {
    setChatOpen(false);
    setQuoteOpen((v) => !v);
  };

  const openChat = () => {
    setQuoteOpen(false);
    setChatOpen((v) => !v);
  };

  return (
    <>
      <AiChatbot hideFab open={chatOpen} onOpenChange={setChatOpen} />

      <div
        className="fixed z-[55] flex flex-col items-end gap-2 sm:bottom-6 sm:right-6"
        style={{
          bottom: FLOATING_SUPPORT_DOCK_BOTTOM,
          right: FLOATING_SUPPORT_DOCK_RIGHT,
        }}
        aria-label={tDock("regionLabel")}
      >
        {quoteOpen ? (
          <div
            ref={quotePanelRef}
            role="dialog"
            aria-label={tQuote("modalTitle")}
            className="relative mb-1 w-[min(18rem,calc(100vw-5rem))] overflow-hidden rounded-2xl border border-white/12 bg-black/60 p-4 text-white shadow-[0_24px_80px_rgba(0,0,0,0.7)] backdrop-blur-xl"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.12] tkad-neon-grid"
            />
            <div className="relative">
              <div className="mb-3 flex items-start justify-between gap-2">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300/90">
                  {tDock("quoteEyebrow")}
                </p>
                <button
                  type="button"
                  onClick={() => setQuoteOpen(false)}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/12 bg-white/5 text-white/80 hover:bg-white/10"
                  aria-label={isKo ? "닫기" : "Close"}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mb-3 text-sm font-bold leading-snug">{tQuote("modalTitle")}</p>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/contact?type=media"
                    onClick={() => setQuoteOpen(false)}
                    className="flex items-center gap-3 rounded-xl border border-white/12 bg-white/5 px-3 py-3 text-sm font-semibold transition-colors hover:bg-white/10"
                  >
                    <Send className="h-4 w-4 shrink-0 text-cyan-300" />
                    {tQuote("mediaQuote")}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact?type=campaign"
                    onClick={() => setQuoteOpen(false)}
                    className="flex items-center gap-3 rounded-xl border border-white/12 bg-white/5 px-3 py-3 text-sm font-semibold transition-colors hover:bg-white/10"
                  >
                    <ClipboardList className="h-4 w-4 shrink-0 text-violet-300" />
                    {tQuote("campaignConsult")}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/planner"
                    onClick={() => setQuoteOpen(false)}
                    className="flex items-center gap-3 rounded-xl border border-white/12 bg-white/5 px-3 py-3 text-sm font-semibold transition-colors hover:bg-white/10"
                  >
                    <Sparkles className="h-4 w-4 shrink-0 text-pink-300" />
                    {tQuote("tryPlanner")}
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        ) : null}

        <div
          className={cn(
            "relative w-[3.25rem] overflow-hidden rounded-[22px] border border-white/12",
            "bg-black/55 shadow-[0_20px_64px_rgba(0,0,0,0.62)] backdrop-blur-xl",
            "ring-1 ring-white/10",
          )}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.14] tkad-neon-grid"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(168,85,247,0.2),transparent_55%),radial-gradient(circle_at_50%_100%,rgba(34,211,238,0.16),transparent_55%)]"
          />

          <div className="relative border-b border-white/10 px-2 py-2">
            <p className="text-center font-mono text-[8px] font-bold uppercase leading-tight tracking-[0.22em] text-white/50">
              {tDock("packageLabel")}
            </p>
          </div>

          <div className="relative flex flex-col gap-1 p-1.5">
            <button
              type="button"
              onClick={openQuote}
              aria-expanded={quoteOpen}
              aria-haspopup="dialog"
              className={cn(
                dockBtnBase,
                quoteOpen
                  ? "bg-gradient-to-br from-violet-500 to-cyan-400 text-white shadow-md shadow-violet-500/30 ring-2 ring-white/25"
                  : "bg-white/8 text-white hover:bg-white/12",
              )}
              aria-label={tQuote("buttonLabel")}
              title={tQuote("buttonLabel")}
            >
              <Send className="h-4 w-4" strokeWidth={2.25} />
            </button>

            <a
              href={KAKAO_CHANNEL_PUBLIC_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                dockBtnBase,
                "bg-[#FEE500] text-[#191600] shadow-sm hover:brightness-105",
              )}
              aria-label={tQuote("kakaoAria")}
              title={tQuote("kakaoAria")}
            >
              <MessageCircle className="h-4 w-4" strokeWidth={2.25} />
            </a>

            <button
              type="button"
              onClick={openChat}
              aria-expanded={chatOpen}
              className={cn(
                dockBtnBase,
                chatOpen
                  ? "bg-white/15 text-white ring-2 ring-white/25"
                  : "bg-[linear-gradient(135deg,rgba(168,85,247,0.9),rgba(34,211,238,0.9),rgba(236,72,153,0.85))] text-white shadow-md shadow-violet-500/25 hover:brightness-110",
              )}
              aria-label={chatOpen ? tAi("closeAria") : tAi("openAria")}
              title={tAi("tooltip")}
            >
              {chatOpen ? (
                <X className="h-4 w-4" strokeWidth={2.25} />
              ) : (
                <Bot className="h-4 w-4" strokeWidth={2.25} />
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { KAKAO_CHANNEL_PUBLIC_URL } from "@/lib/kakao-public";
import { usePageScrollEdges } from "@/lib/use-page-scroll-edges";
import { cn } from "@/lib/utils";
import { SupportChatWidget } from "@/components/support/support-chat-widget";

const dockBtnBase =
  "relative flex h-11 w-full items-center justify-center rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/45";

const scrollBtnClass = cn(
  dockBtnBase,
  "border dark:border-white/10 border-gray-200 dark:bg-white/8 bg-gray-100 dark:text-white text-gray-900 hover:bg-white/14",
  "disabled:pointer-events-none disabled:opacity-40",
);

const dockPreviewReveal = cn(
  "pointer-events-none absolute top-1/2 right-full z-10 mr-2 -translate-y-1/2",
  "max-w-0 overflow-hidden opacity-0",
  "transition-[max-width,opacity] duration-300 ease-out",
  "group-hover/dock-action:max-w-[min(15rem,calc(100vw-6rem))] group-hover/dock-action:opacity-100",
  "group-focus-within/dock-action:max-w-[min(15rem,calc(100vw-6rem))] group-focus-within/dock-action:opacity-100",
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

function DockPreviewRow({
  icon,
  title,
  hint,
}: {
  icon: ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-white/8 dark:bg-white/5 bg-gray-50 px-2.5 py-2">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border dark:border-white/10 border-gray-200 dark:bg-black bg-white/30 dark:text-white text-gray-800">
        {icon}
      </span>
      <span className="min-w-0 text-left">
        <span className="block text-[12px] font-semibold leading-tight dark:text-white text-gray-900">
          {title}
        </span>
        <span className="mt-0.5 block text-[10px] leading-snug dark:text-white text-gray-500">
          {hint}
        </span>
      </span>
    </div>
  );
}

function DockActionWithPreview({
  icon,
  title,
  hint,
  children,
}: {
  icon: ReactNode;
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <div className="group/dock-action relative">
      <div className={dockPreviewReveal}>
        <div className="relative w-[min(15rem,calc(100vw-6rem))] overflow-hidden rounded-2xl border dark:border-white/12 border-gray-200 dark:bg-black bg-white/70 p-2 shadow-[0_20px_64px_rgba(0,0,0,0.65)] backdrop-blur-xl">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.1] tkad-neon-grid"
          />
          <div className="relative">
            <DockPreviewRow icon={icon} title={title} hint={hint} />
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

function MobileKakaoChatButton({
  mounted,
  label,
}: {
  mounted: boolean;
  label: string;
}) {
  return (
    <a
      href={KAKAO_CHANNEL_PUBLIC_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "fixed bottom-6 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[#FEE500] text-[#191600] shadow-[0_8px_28px_rgba(0,0,0,0.18)] transition-transform hover:scale-105 active:scale-95 md:hidden",
        !mounted && "pointer-events-none opacity-0",
      )}
      style={{
        bottom: "max(1.5rem, env(safe-area-inset-bottom, 0px))",
        right: "max(1rem, env(safe-area-inset-right, 0px))",
      }}
      aria-label={label}
      title={label}
    >
      <KakaoTalkIcon className="h-6 w-6" />
    </a>
  );
}

export default function FloatingSupportDock() {
  const pathname = usePathname();
  const locale = useLocale();
  const isKo = locale === "ko";
  const tQuote = useTranslations("quoteFab");
  const tDock = useTranslations("supportDock");
  const tChat = useTranslations("supportChat");
  const tCommon = useTranslations("common");
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const quotePanelRef = useRef<HTMLDivElement>(null);

  const { mounted, scrollable, nearTop, nearBottom, goTop, goBottom } =
    usePageScrollEdges();

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
    setChatMenuOpen(false);
  }, [pathname]);

  if (hidden) return null;

  const openQuote = () => {
    setChatMenuOpen(false);
    setQuoteOpen((v) => !v);
  };

  return (
    <>
      <MobileKakaoChatButton mounted={mounted} label={tChat("kakaoCta")} />

      <div
        className={cn(
          "fixed bottom-6 right-6 z-50 hidden flex-col items-end gap-2 md:flex",
          !mounted && "pointer-events-none opacity-0",
        )}
        aria-label={tDock("regionLabel")}
      >
        {quoteOpen ? (
          <div
            ref={quotePanelRef}
            role="dialog"
            aria-label={tQuote("modalTitle")}
            className="relative w-[min(18rem,calc(100vw-5rem))] overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 text-gray-900 shadow-xl dark:border-white/12 dark:bg-gray-900 dark:text-white"
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
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border dark:border-white/12 border-gray-200 dark:bg-white/5 bg-gray-50 dark:text-white text-gray-700 hover:dark:bg-white/10 bg-gray-100"
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
                    className="flex items-center gap-3 rounded-xl border dark:border-white/12 border-gray-200 dark:bg-white/5 bg-gray-50 px-3 py-3 text-sm font-semibold transition-colors hover:dark:bg-white/10 bg-gray-100"
                  >
                    <Send className="h-4 w-4 shrink-0 text-cyan-300" />
                    {tQuote("mediaQuote")}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact?type=campaign"
                    onClick={() => setQuoteOpen(false)}
                    className="flex items-center gap-3 rounded-xl border dark:border-white/12 border-gray-200 dark:bg-white/5 bg-gray-50 px-3 py-3 text-sm font-semibold transition-colors hover:dark:bg-white/10 bg-gray-100"
                  >
                    <ClipboardList className="h-4 w-4 shrink-0 text-violet-300" />
                    {tQuote("campaignConsult")}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/planner"
                    onClick={() => setQuoteOpen(false)}
                    className="flex items-center gap-3 rounded-xl border dark:border-white/12 border-gray-200 dark:bg-white/5 bg-gray-50 px-3 py-3 text-sm font-semibold transition-colors hover:dark:bg-white/10 bg-gray-100"
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
            "relative w-[3.25rem] overflow-visible rounded-[22px] border border-gray-200 bg-white shadow-xl dark:border-white/12 dark:bg-gray-900 dark:shadow-[0_20px_64px_rgba(0,0,0,0.62)]",
            "ring-1 ring-white/10",
          )}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-[22px] opacity-[0.14] tkad-neon-grid"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-[22px] bg-[radial-gradient(circle_at_50%_0%,rgba(168,85,247,0.2),transparent_55%),radial-gradient(circle_at_50%_100%,rgba(34,211,238,0.16),transparent_55%)]"
          />

          <div className="relative border-b dark:border-white/10 border-gray-200 px-2 py-2">
            <p className="text-center font-mono text-[8px] font-bold uppercase leading-tight tracking-[0.22em] text-gray-400 dark:text-white/40">
              {tDock("packageLabel")}
            </p>
          </div>

          {scrollable ? (
            <div
              className="relative flex flex-col gap-1 border-b dark:border-white/10 border-gray-200 p-1.5"
              role="navigation"
              aria-label={tCommon("scrollNavLabel")}
            >
              <button
                type="button"
                onClick={goTop}
                disabled={nearTop}
                className={scrollBtnClass}
                aria-label={tCommon("scrollToTop")}
                title={tCommon("scrollToTop")}
              >
                <ChevronUp className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              </button>
              <button
                type="button"
                onClick={goBottom}
                disabled={nearBottom}
                className={scrollBtnClass}
                aria-label={tCommon("scrollToBottom")}
                title={tCommon("scrollToBottom")}
              >
                <ChevronDown className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              </button>
            </div>
          ) : null}

          <div className="flex flex-col gap-1 p-1.5">
            <DockActionWithPreview
              icon={<Send className="h-3.5 w-3.5" aria-hidden />}
              title={tDock("quotePreviewTitle")}
              hint={tDock("quotePreviewHint")}
            >
              <button
                type="button"
                onClick={openQuote}
                aria-expanded={quoteOpen}
                aria-haspopup="dialog"
                className={cn(
                  dockBtnBase,
                  quoteOpen
                    ? "bg-gradient-to-br from-violet-500 to-cyan-400 dark:text-white text-gray-900 shadow-md shadow-violet-500/30 ring-2 ring-white/25"
                    : "dark:bg-white/8 bg-gray-100 dark:text-white text-gray-900 hover:bg-white/12",
                )}
                aria-label={tQuote("buttonLabel")}
                title={tQuote("buttonLabel")}
              >
                <Send className="h-4 w-4" strokeWidth={2.25} />
              </button>
            </DockActionWithPreview>

            <DockActionWithPreview
              icon={<KakaoTalkIcon className="h-3.5 w-3.5" aria-hidden />}
              title={tDock("chatPreviewTitle")}
              hint={tDock("chatPreviewHint")}
            >
              <SupportChatWidget
                menuOpen={chatMenuOpen}
                onMenuOpenChange={(open) => {
                  if (open) setQuoteOpen(false);
                  setChatMenuOpen(open);
                }}
              />
            </DockActionWithPreview>
          </div>
        </div>
      </div>
    </>
  );
}

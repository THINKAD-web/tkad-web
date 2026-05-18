"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ClipboardList, MessageCircle, Send, Sparkles, X } from "lucide-react";
import { KAKAO_CHANNEL_PUBLIC_URL } from "@/lib/kakao-public";
import { cn } from "@/lib/utils";

const QUOTE_GRADIENT =
  "bg-gradient-to-r from-violet-500 to-cyan-400 shadow-lg shadow-violet-500/30";

export default function FloatingQuoteFab() {
  const pathname = usePathname();
  const locale = useLocale();
  const isKo = locale === "ko";
  const t = useTranslations("quoteFab");
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const hidden =
    pathname.includes("/admin") ||
    pathname.includes("/login") ||
    pathname.includes("/register");

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (hidden) return null;

  return (
    <div
      className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom,0px))] right-[calc(max(1rem,env(safe-area-inset-right,0px))+3.25rem)] z-[55] flex flex-col items-end gap-2 sm:right-[calc(1.5rem+3.25rem)]"
      aria-label={t("regionLabel")}
    >
      {open ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-label={t("modalTitle")}
          className="mb-1 w-[min(18rem,calc(100vw-5rem))] overflow-hidden rounded-2xl border border-white/12 bg-black/55 p-4 text-white shadow-[0_24px_80px_rgba(0,0,0,0.65)] backdrop-blur"
        >
          <div className="mb-3 flex items-start justify-between gap-2">
            <p className="text-sm font-bold leading-snug">{t("modalTitle")}</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/12 bg-white/5 text-white/80 hover:bg-white/10"
              aria-label={isKo ? "닫기" : "Close"}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <ul className="space-y-2">
            <li>
              <Link
                href="/contact?type=media"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl border border-white/12 bg-white/5 px-3 py-3 text-sm font-semibold transition-colors hover:bg-white/10"
              >
                <Send className="h-4 w-4 shrink-0 text-cyan-300" />
                {t("mediaQuote")}
              </Link>
            </li>
            <li>
              <Link
                href="/contact?type=campaign"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl border border-white/12 bg-white/5 px-3 py-3 text-sm font-semibold transition-colors hover:bg-white/10"
              >
                <ClipboardList className="h-4 w-4 shrink-0 text-violet-300" />
                {t("campaignConsult")}
              </Link>
            </li>
            <li>
              <Link
                href="/planner"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl border border-white/12 bg-white/5 px-3 py-3 text-sm font-semibold transition-colors hover:bg-white/10"
              >
                <Sparkles className="h-4 w-4 shrink-0 text-pink-300" />
                {t("tryPlanner")}
              </Link>
            </li>
          </ul>
        </div>
      ) : null}

      <div className="flex flex-row-reverse items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "inline-flex h-12 items-center gap-2 rounded-full px-4 text-sm font-bold text-white transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50",
            QUOTE_GRADIENT,
            open && "ring-2 ring-white/25",
          )}
          aria-expanded={open}
          aria-haspopup="dialog"
        >
          <Send className="h-4 w-4 shrink-0" strokeWidth={2.25} />
          <span className="max-[380px]:sr-only">{t("buttonLabel")}</span>
        </button>

        <a
          href={KAKAO_CHANNEL_PUBLIC_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-black/10 text-[#191600] shadow-lg transition-transform hover:scale-105"
          style={{ backgroundColor: "#FEE500" }}
          aria-label={t("kakaoAria")}
          title={t("kakaoAria")}
        >
          <MessageCircle className="h-5 w-5" strokeWidth={2.25} />
        </a>
      </div>
    </div>
  );
}

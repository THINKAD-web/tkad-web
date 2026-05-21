"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp } from "lucide-react";
import { FLOATING_SUPPORT_DOCK_SCROLL_OFFSET } from "@/lib/floating-support-dock-layout";
import { cn } from "@/lib/utils";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const scrollBtnClass = cn(
  "pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full border-2 backdrop-blur-md transition-all",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
  "border-navy/20 bg-white/95 text-navy shadow-[0_8px_28px_rgba(15,23,42,0.18)]",
  "hover:border-gold/50 hover:bg-gold/15 hover:text-navy",
  "dark:border-cyan-400/55 dark:bg-zinc-950/95 dark:text-cyan-100",
  "dark:shadow-[0_0_24px_rgba(34,211,238,0.38),0_10px_32px_rgba(0,0,0,0.65)]",
  "dark:ring-1 dark:ring-cyan-400/25",
  "dark:hover:border-cyan-300/80 dark:hover:bg-cyan-500/20 dark:hover:dark:text-white text-gray-900 dark:hover:shadow-[0_0_28px_rgba(34,211,238,0.5),0_10px_32px_rgba(0,0,0,0.65)]",
  "disabled:pointer-events-none disabled:opacity-45 dark:disabled:opacity-55",
);

export default function FloatingScrollNav() {
  const t = useTranslations("common");
  const [mounted, setMounted] = useState(false);
  const [scrollable, setScrollable] = useState(false);
  const [nearTop, setNearTop] = useState(true);
  const [nearBottom, setNearBottom] = useState(false);

  const update = useCallback(() => {
    const el = document.documentElement;
    const y = window.scrollY;
    const vh = window.innerHeight;
    const sh = el.scrollHeight;
    const maxScroll = Math.max(0, sh - vh);
    setScrollable(maxScroll > 48);
    setNearTop(y < 72);
    setNearBottom(y >= maxScroll - 72);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setMounted(true);
      update();
    });
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update]);

  const goTop = useCallback(() => {
    const behavior = prefersReducedMotion() ? "auto" : "smooth";
    window.scrollTo({ top: 0, behavior });
  }, []);

  const goBottom = useCallback(() => {
    const el = document.documentElement;
    const top = Math.max(0, el.scrollHeight - window.innerHeight);
    const behavior = prefersReducedMotion() ? "auto" : "smooth";
    window.scrollTo({ top, behavior });
  }, []);

  if (!mounted || !scrollable) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-[max(5.75rem,calc(env(safe-area-inset-bottom,0px)+5rem))] z-[52] flex flex-col gap-2 sm:right-6"
      style={{
        right: `calc(max(1rem, env(safe-area-inset-right, 0px)) + ${FLOATING_SUPPORT_DOCK_SCROLL_OFFSET})`,
      }}
      role="navigation"
      aria-label={t("scrollNavLabel")}
    >
      <button
        type="button"
        onClick={goTop}
        disabled={nearTop}
        className={scrollBtnClass}
        aria-label={t("scrollToTop")}
      >
        <ChevronUp className="h-5 w-5" strokeWidth={2.25} aria-hidden />
      </button>
      <button
        type="button"
        onClick={goBottom}
        disabled={nearBottom}
        className={scrollBtnClass}
        aria-label={t("scrollToBottom")}
      >
        <ChevronDown className="h-5 w-5" strokeWidth={2.25} aria-hidden />
      </button>
    </div>
  );
}

"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const SCROLL_STATE_DEFAULT = { scrollable: false, nearTop: true, nearBottom: false };
type ScrollState = typeof SCROLL_STATE_DEFAULT;

function readScrollState(): ScrollState {
  const el = document.documentElement;
  const y = window.scrollY;
  const vh = window.innerHeight;
  const sh = el.scrollHeight;
  const maxScroll = Math.max(0, sh - vh);
  return {
    scrollable: maxScroll > 48,
    nearTop: y < 72,
    nearBottom: y >= maxScroll - 72,
  };
}

let cachedScrollState: ScrollState = SCROLL_STATE_DEFAULT;

function getScrollSnapshot(): ScrollState {
  const next = readScrollState();
  const prev = cachedScrollState;
  if (
    prev.scrollable === next.scrollable &&
    prev.nearTop === next.nearTop &&
    prev.nearBottom === next.nearBottom
  ) {
    return prev;
  }
  cachedScrollState = next;
  return next;
}

function subscribeScroll(onChange: () => void): () => void {
  window.addEventListener("scroll", onChange, { passive: true });
  window.addEventListener("resize", onChange, { passive: true });
  return () => {
    window.removeEventListener("scroll", onChange);
    window.removeEventListener("resize", onChange);
  };
}

const getServerScrollSnapshot = () => SCROLL_STATE_DEFAULT;

export default function FloatingScrollNav() {
  const t = useTranslations("common");
  const { scrollable, nearTop, nearBottom } = useSyncExternalStore(
    subscribeScroll,
    getScrollSnapshot,
    getServerScrollSnapshot,
  );

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

  if (!scrollable) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-[max(5.75rem,calc(env(safe-area-inset-bottom,0px)+5rem))] right-[max(1rem,env(safe-area-inset-right,0px))] z-[52] flex flex-col gap-2 sm:right-6"
      role="navigation"
      aria-label={t("scrollNavLabel")}
    >
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={goTop}
        disabled={nearTop}
        className={cn(
          "pointer-events-auto h-11 w-11 rounded-full border-navy/15 bg-white/95 text-navy shadow-lg backdrop-blur-sm transition-opacity hover:bg-gold/15 disabled:pointer-events-none disabled:opacity-35",
        )}
        aria-label={t("scrollToTop")}
      >
        <ChevronUp className="h-5 w-5" aria-hidden />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={goBottom}
        disabled={nearBottom}
        className={cn(
          "pointer-events-auto h-11 w-11 rounded-full border-navy/15 bg-white/95 text-navy shadow-lg backdrop-blur-sm transition-opacity hover:bg-gold/15 disabled:pointer-events-none disabled:opacity-35",
        )}
        aria-label={t("scrollToBottom")}
      >
        <ChevronDown className="h-5 w-5" aria-hidden />
      </Button>
    </div>
  );
}

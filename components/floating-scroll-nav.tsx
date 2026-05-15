"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

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

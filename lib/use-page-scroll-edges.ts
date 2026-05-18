"use client";

import { useCallback, useEffect, useState } from "react";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function usePageScrollEdges() {
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
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, []);

  const goBottom = useCallback(() => {
    const top = Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight,
    );
    window.scrollTo({ top, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, []);

  return { mounted, scrollable, nearTop, nearBottom, goTop, goBottom };
}

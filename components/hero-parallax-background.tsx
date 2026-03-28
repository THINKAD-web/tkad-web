"use client";

import { useEffect, useRef } from "react";

/**
 * Subtle scroll-based parallax on hero gradient + pattern layers.
 * Respects prefers-reduced-motion.
 */
export default function HeroParallaxBackground() {
  const gradientRef = useRef<HTMLDivElement>(null);
  const patternRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const gradient = gradientRef.current;
    const pattern = patternRef.current;
    if (!gradient || !pattern) return;

    const onScroll = () => {
      const y = window.scrollY;
      const slow = Math.min(y * 0.04, 42);
      const mid = Math.min(y * 0.065, 56);
      gradient.style.transform = `translate3d(0, ${slow}px, 0)`;
      pattern.style.transform = `translate3d(0, ${mid}px, 0)`;
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <div
        ref={gradientRef}
        className="pointer-events-none absolute inset-0 z-0 will-change-transform hero-bg"
        aria-hidden
      />
      <div
        ref={patternRef}
        className="pointer-events-none absolute inset-0 z-[1] will-change-transform hero-pattern"
        aria-hidden
      />
    </>
  );
}

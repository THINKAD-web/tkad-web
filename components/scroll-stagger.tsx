"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  className?: string;
  /** Intersection threshold (0–1). */
  threshold?: number;
  rootMargin?: string;
};

/**
 * When the block enters the viewport, direct children fade/slide in with staggered delays.
 */
export function ScrollStagger({
  children,
  className,
  threshold = 0.08,
  rootMargin = "0px 0px -8% 0px",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.classList.add("scroll-stagger-visible");
      return;
    }

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("scroll-stagger-visible");
          obs.disconnect();
        }
      },
      { threshold, rootMargin },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold, rootMargin]);

  return (
    <div ref={ref} className={cn("scroll-stagger", className)}>
      {children}
    </div>
  );
}

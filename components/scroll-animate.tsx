"use client";

import { useEffect, useRef, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  /** Delay in ms. 인덱스 스태거는 `staggerDelayMs(i)` 를 쓸 것. */
  delay?: number;
  /** "fade-up" (default) | "fade-in" | "count-up" */
  variant?: "fade-up" | "fade-in" | "count-up";
  threshold?: number;
  rootMargin?: string;
};

export default function ScrollAnimate({
  children,
  className = "",
  delay = 0,
  variant = "fade-up",
  threshold = 0.1,
  rootMargin = "0px 0px -32px 0px",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof window !== "undefined") {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) {
        if (variant === "count-up") {
          el.classList.remove("scroll-count-paused");
        } else {
          el.classList.add("scroll-visible");
        }
        return;
      }
    }

    if (variant === "count-up") {
      el.classList.add("scroll-count-paused");
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (variant === "count-up") {
            el.classList.remove("scroll-count-paused");
          } else {
            el.classList.add("scroll-visible");
          }
          observer.unobserve(el);
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [variant, threshold, rootMargin]);

  const baseClass =
    variant === "count-up"
      ? ""
      : variant === "fade-in"
        ? "scroll-fade"
        : "scroll-fade-up";

  return (
    <div
      ref={ref}
      className={`${baseClass} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms`, animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

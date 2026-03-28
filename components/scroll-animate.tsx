"use client";

import { useEffect, useRef, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  delay?: number;
  /** "fade-up" (default) | "fade-in" | "count-up" */
  variant?: "fade-up" | "fade-in" | "count-up";
};

export default function ScrollAnimate({
  children,
  className = "",
  delay = 0,
  variant = "fade-up",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

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
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [variant]);

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

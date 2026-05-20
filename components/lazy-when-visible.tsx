"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  className?: string;
  /** 뷰포트 진입 전 최소 높이(레이아웃 시프트 완화) */
  minHeight?: number | string;
  rootMargin?: string;
};

/**
 * IntersectionObserver — 홈 하단 등 below-the-fold 섹션 지연 마운트.
 */
export function LazyWhenVisible({
  children,
  className,
  minHeight = 120,
  rootMargin = "200px 0px",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin, threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible, rootMargin]);

  return (
    <div
      ref={ref}
      className={cn(className)}
      style={!visible ? { minHeight } : undefined}
    >
      {visible ? children : null}
    </div>
  );
}

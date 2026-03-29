"use client";

import type { ReactNode } from "react";
import ScrollAnimate from "@/components/scroll-animate";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  className?: string;
  /** Intersection stagger (ms) */
  delay?: number;
  variant?: "fade-up" | "fade-in";
};

export function AnimatedCard({
  children,
  className,
  delay = 0,
  variant = "fade-up",
}: Props) {
  return (
    <ScrollAnimate variant={variant} delay={delay} className={cn("h-full", className)}>
      {children}
    </ScrollAnimate>
  );
}

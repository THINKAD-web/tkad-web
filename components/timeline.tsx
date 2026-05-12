"use client";

import type { ReactNode } from "react";
import { AnimatedCard } from "@/components/animated-card";
import { cn } from "@/lib/utils";

export type TimelineEntry = {
  /** 연도, 스텝 번호 등 타임라인 뱃지 */
  label: string;
  title: string;
  description?: ReactNode;
};

type Props = {
  items: TimelineEntry[];
  className?: string;
};

export function Timeline({ items, className }: Props) {
  return (
    <div className={cn("relative", className)}>
      <div
        className="pointer-events-none absolute left-[7px] top-3 bottom-3 w-0.5 bg-hero-void sm:left-[9px]"
        aria-hidden
      />
      <ul className="relative m-0 list-none space-y-6 pl-0 sm:space-y-8">
        {items.map((item, i) => (
          <li key={`${item.label}-${item.title}`} className="relative pl-10 sm:pl-12">
            <span
              className="absolute left-0 top-4 flex h-4 w-4 border-2 border-accent bg-accent"
              aria-hidden
            />
            <AnimatedCard delay={i * 90}>
              <div className="border-2 border-border bg-card p-5 sm:p-6">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
                  [ STEP {item.label} ]
                </p>
                <p className="mt-2 text-base font-bold tracking-tight text-foreground sm:text-lg">
                  {item.title}
                </p>
                {item.description ? (
                  <div className="mt-3 font-mono text-[12px] leading-relaxed tracking-tight text-muted-foreground">
                    {item.description}
                  </div>
                ) : null}
              </div>
            </AnimatedCard>
          </li>
        ))}
      </ul>
    </div>
  );
}

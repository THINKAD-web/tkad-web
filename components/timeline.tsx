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
        className="pointer-events-none absolute left-[7px] top-3 bottom-3 w-px bg-gradient-to-b from-gold/45 via-navy/12 to-transparent sm:left-[9px]"
        aria-hidden
      />
      <ul className="relative m-0 list-none space-y-10 pl-0 sm:space-y-12">
        {items.map((item, i) => (
          <li key={`${item.label}-${item.title}`} className="relative pl-10 sm:pl-12">
            <span
              className="absolute left-0 top-3 flex h-3.5 w-3.5 rounded-full border-2 border-gold bg-white shadow-sm ring-4 ring-gold/12"
              aria-hidden
            />
            <AnimatedCard delay={i * 90}>
              <div className="rounded-2xl border border-navy/8 bg-white p-5 shadow-sm transition-shadow duration-300 hover:shadow-md sm:p-6">
                <p className="text-sm font-bold tabular-nums text-gold">{item.label}</p>
                <p className="mt-1 text-base font-semibold text-navy sm:text-lg">
                  {item.title}
                </p>
                {item.description ? (
                  <div className="mt-2 text-sm leading-relaxed text-muted-foreground">
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

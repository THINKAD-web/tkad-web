"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedCard } from "@/components/animated-card";

export type FaqItem = { question: string; answer: string };

type Props = {
  title: string;
  items: FaqItem[];
  className?: string;
};

export function ServicesFaq({ title, items, className }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className={cn(className)}>
      <h2 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">
        {title}
      </h2>
      <ul className="mt-8 space-y-3">
        {items.map((item, i) => {
          const open = openIndex === i;
          return (
            <li key={item.question}>
              <AnimatedCard delay={i * 70}>
                <div className="overflow-hidden rounded-2xl border border-navy/8 bg-white shadow-sm">
                  <button
                    type="button"
                    onClick={() => setOpenIndex(open ? null : i)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-navy/[0.03] sm:px-6"
                    aria-expanded={open}
                  >
                    <span className="text-sm font-semibold text-navy sm:text-base">
                      {item.question}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-5 w-5 shrink-0 text-gold transition-transform duration-200",
                        open && "rotate-180",
                      )}
                      aria-hidden
                    />
                  </button>
                  <div
                    className={cn(
                      "grid transition-[grid-template-rows] duration-200 ease-out",
                      open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                    )}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <p className="px-5 pb-4 pt-0 text-sm leading-relaxed text-muted-foreground sm:px-6 sm:pb-5">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                </div>
              </AnimatedCard>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

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
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
        [ FAQ ]
      </p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-bx-black sm:text-3xl">
        {title}
      </h2>
      <ul className="mt-8 space-y-0">
        {items.map((item, i) => {
          const open = openIndex === i;
          return (
            <li key={item.question}>
              <AnimatedCard delay={i * 70}>
                <div className="-mt-[2px] overflow-hidden border-2 border-bx-black bg-bx-white">
                  <button
                    type="button"
                    onClick={() => setOpenIndex(open ? null : i)}
                    className="flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-bx-off sm:px-6"
                    aria-expanded={open}
                  >
                    <span
                      aria-hidden
                      className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center border-2 border-bx-accent bg-bx-accent font-mono text-[11px] font-bold text-bx-white"
                    >
                      Q
                    </span>
                    <span className="flex-1 text-sm font-bold tracking-tight text-bx-black sm:text-base">
                      {item.question}
                    </span>
                    <ChevronDown
                      className={cn(
                        "mt-1 h-5 w-5 shrink-0 text-bx-accent transition-transform duration-200",
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
                      <div className="flex items-start gap-3 border-t-2 border-bx-black bg-bx-off px-5 pb-4 pt-4 sm:px-6 sm:pb-5">
                        <span
                          aria-hidden
                          className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center border-2 border-bx-black bg-bx-black font-mono text-[11px] font-bold text-bx-white"
                        >
                          A
                        </span>
                        <p className="flex-1 text-sm leading-relaxed text-bx-black">
                          {item.answer}
                        </p>
                      </div>
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

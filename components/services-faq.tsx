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

/**
 * /services 등 다크 네온 섹션 안에서도 가독성 유지.
 * (라이트 사이트 테마일 때 `text-foreground` 가 어두워 배경에 묻음)
 */
export function ServicesFaq({ title, items, className }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className={cn("tkad-services-faq", className)}>
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/55">
        [ FAQ ]
      </p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
        {title}
      </h2>
      <ul className="mt-8 space-y-0">
        {items.map((item, i) => {
          const open = openIndex === i;
          return (
            <li key={item.question}>
              <AnimatedCard delay={i * 70}>
                <div className="-mt-[2px] overflow-hidden rounded-[2px] border border-white/14 bg-white/5 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
                  <button
                    type="button"
                    onClick={() => setOpenIndex(open ? null : i)}
                    className="flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-white/8 sm:px-6"
                    aria-expanded={open}
                  >
                    <span
                      aria-hidden
                      className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center border border-white/20 bg-white/10 font-mono text-[11px] font-bold text-cyan-200"
                    >
                      Q
                    </span>
                    <span className="flex-1 text-sm font-bold tracking-tight text-white sm:text-base">
                      {item.question}
                    </span>
                    <ChevronDown
                      className={cn(
                        "mt-1 h-5 w-5 shrink-0 text-white/70 transition-transform duration-200",
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
                      <div className="tkad-services-faq-answer flex items-start gap-3 border-t border-white/12 bg-black/25 px-5 pb-4 pt-4 sm:px-6 sm:pb-5">
                        <span
                          aria-hidden
                          className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center border border-white/18 bg-white/8 font-mono text-[11px] font-bold text-white/90"
                        >
                          A
                        </span>
                        <p className="flex-1 text-sm leading-relaxed text-white/85">
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

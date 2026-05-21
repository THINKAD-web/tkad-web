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
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] dark:text-white text-gray-500">
        [ FAQ ]
      </p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight dark:text-white text-gray-900 sm:text-3xl">
        {title}
      </h2>
      <ul className="mt-8 space-y-0">
        {items.map((item, i) => {
          const open = openIndex === i;
          return (
            <li key={item.question}>
              <AnimatedCard delay={i * 70}>
                <div className="-mt-[2px] overflow-hidden rounded-[2px] border dark:border-white/14 border-gray-200 dark:bg-white/5 bg-gray-50 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
                  <button
                    type="button"
                    onClick={() => setOpenIndex(open ? null : i)}
                    className="flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:dark:bg-white/8 bg-gray-100 sm:px-6"
                    aria-expanded={open}
                  >
                    <span
                      aria-hidden
                      className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center border dark:border-white/20 border-gray-300 dark:bg-white/10 bg-gray-100 font-mono text-[11px] font-bold text-cyan-200"
                    >
                      Q
                    </span>
                    <span className="flex-1 text-sm font-bold tracking-tight dark:text-white text-gray-900 sm:text-base">
                      {item.question}
                    </span>
                    <ChevronDown
                      className={cn(
                        "mt-1 h-5 w-5 shrink-0 dark:text-white text-gray-600 transition-transform duration-200",
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
                      <div className="tkad-services-faq-answer flex items-start gap-3 border-t dark:border-white/12 border-gray-200 dark:bg-black bg-white bg-white/25 px-5 pb-4 pt-4 sm:px-6 sm:pb-5">
                        <span
                          aria-hidden
                          className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center border dark:border-white/18 border-gray-300 dark:bg-white/8 bg-gray-100 font-mono text-[11px] font-bold dark:text-white text-gray-800"
                        >
                          A
                        </span>
                        <p className="flex-1 text-sm leading-relaxed dark:text-white text-gray-800">
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

"use client";

import { SlidersHorizontal, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type RecommendInputMode = "structured" | "ai";

type Props = {
  isKo: boolean;
  mode: RecommendInputMode;
  onModeChange: (mode: RecommendInputMode) => void;
  className?: string;
};

const BTN_BASE =
  "flex aspect-square w-[7.25rem] max-w-[42vw] flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 py-2.5 text-center text-xs font-semibold leading-tight transition-colors sm:w-[8rem] sm:text-sm";

export function RecommendInputModeToggle({
  isKo,
  mode,
  onModeChange,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "mx-auto mb-4 flex w-full max-w-md flex-wrap items-stretch justify-center gap-2 sm:gap-3",
        className,
      )}
      role="tablist"
      aria-label={isKo ? "입력 방식" : "Input mode"}
    >
      <button
        type="button"
        role="tab"
        aria-selected={mode === "structured"}
        onClick={() => onModeChange("structured")}
        className={cn(
          BTN_BASE,
          mode === "structured"
            ? "border-gray-200 bg-white text-gray-900 shadow-sm dark:border-white/15 dark:bg-white/10 dark:text-white"
            : "border-transparent bg-gray-50/80 text-gray-500 dark:bg-white/5 dark:text-white/55",
        )}
      >
        <SlidersHorizontal className="h-5 w-5 shrink-0" aria-hidden />
        <span>{isKo ? "구조화 입력" : "Structured"}</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === "ai"}
        onClick={() => onModeChange("ai")}
        className={cn(
          BTN_BASE,
          mode === "ai"
            ? "border-gray-200 bg-white text-gray-900 shadow-sm dark:border-white/15 dark:bg-white/10 dark:text-white"
            : "border-transparent bg-gray-50/80 text-gray-500 dark:bg-white/5 dark:text-white/55",
        )}
      >
        <Sparkles
          className="h-5 w-5 shrink-0 text-[color:var(--qp-accent)]"
          aria-hidden
        />
        <span>{isKo ? "AI 자연어 입력" : "AI natural language"}</span>
        <span className="rounded border border-[color:var(--qp-accent)]/35 bg-[color:var(--qp-accent-soft)] px-1 text-[9px] font-bold uppercase text-[color:var(--qp-accent)]">
          {isKo ? "무료" : "Free"}
        </span>
      </button>
    </div>
  );
}

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

const SEGMENT =
  "flex flex-1 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2.5 text-center text-xs font-semibold leading-tight transition-colors sm:flex-row sm:gap-2 sm:py-2 sm:text-sm";

/** 1차(플래너 전환) 카드 아래 보조 입력 방식 — 톤을 낮춘 세그먼트 */
export function RecommendInputModeToggle({
  isKo,
  mode,
  onModeChange,
  className,
}: Props) {
  return (
    <div className={cn("mx-auto mb-5 w-full max-w-md", className)}>
      <p className="mb-2 text-center text-[11px] font-medium tracking-wide text-muted-foreground">
        {isKo ? "입력 방식" : "Input mode"}
      </p>
      <div
        className="flex gap-1 rounded-xl bg-muted/45 p-1 dark:bg-white/[0.04]"
        role="tablist"
        aria-label={isKo ? "입력 방식" : "Input mode"}
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "structured"}
          onClick={() => onModeChange("structured")}
          className={cn(
            SEGMENT,
            mode === "structured"
              ? "bg-background text-foreground shadow-sm ring-1 ring-border/60 dark:bg-white/10 dark:ring-white/10"
              : "text-muted-foreground hover:text-foreground/80",
          )}
        >
          <SlidersHorizontal className="h-4 w-4 shrink-0 sm:h-[1.125rem] sm:w-[1.125rem]" aria-hidden />
          <span>{isKo ? "구조화 입력" : "Structured"}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "ai"}
          onClick={() => onModeChange("ai")}
          className={cn(
            SEGMENT,
            mode === "ai"
              ? "bg-background text-foreground shadow-sm ring-1 ring-border/60 dark:bg-white/10 dark:ring-white/10"
              : "text-muted-foreground hover:text-foreground/80",
          )}
        >
          <Sparkles
            className="h-4 w-4 shrink-0 text-[color:var(--qp-accent)] sm:h-[1.125rem] sm:w-[1.125rem]"
            aria-hidden
          />
          <span>{isKo ? "AI 자연어 입력" : "AI natural language"}</span>
          <span className="rounded border border-[color:var(--qp-accent)]/35 bg-[color:var(--qp-accent-soft)] px-1 text-[9px] font-bold uppercase text-[color:var(--qp-accent)]">
            {isKo ? "무료" : "Free"}
          </span>
        </button>
      </div>
    </div>
  );
}

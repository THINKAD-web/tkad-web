import { cn } from "@/lib/utils";

export type MediaActionPillVariant = "cart" | "compare";

/** 매체 카드 — 담기/비교 공통 알약 버튼 */
export function mediaActionPillClass(
  active: boolean,
  variant: MediaActionPillVariant = "cart",
  className?: string,
) {
  return cn(
    "inline-flex h-5 shrink-0 items-center justify-center gap-0.5 whitespace-nowrap rounded-full border px-2 text-[9px] font-semibold leading-none backdrop-blur transition-colors",
    active
      ? variant === "cart"
        ? "border-rose-400/55 bg-rose-500/15 text-rose-800 shadow-sm dark:border-rose-400/40 dark:bg-rose-500/20 dark:text-rose-100"
        : "border-hermes/30 bg-hermes/15 text-hermes shadow-sm"
      : "border-gray-200/90 bg-white/90 text-gray-600 hover:border-gray-300 hover:bg-white dark:border-white/12 dark:bg-white/8 dark:text-white/75 dark:hover:bg-white/12",
    className,
  );
}

/** 피드/그리드 — 담기·비교 큰 버튼 (rounded-lg) */
export function mediaActionBlockClass(
  active: boolean,
  variant: MediaActionPillVariant,
  className?: string,
) {
  return cn(
    "inline-flex items-center justify-center gap-1 rounded-lg border font-semibold transition-colors",
    active
      ? variant === "cart"
        ? "border-rose-400/50 bg-rose-500/14 text-rose-800 dark:text-rose-100"
        : "border-hermes/30 bg-hermes/15 text-hermes"
      : "border-gray-200/90 bg-white/90 text-gray-700 hover:bg-gray-50 dark:border-white/12 dark:bg-white/8 dark:text-white/90 dark:hover:bg-white/12",
    className,
  );
}

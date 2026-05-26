import { cn } from "@/lib/utils";

/** 매체 카드 — 선택/담기 공통 알약 버튼 */
export function mediaActionPillClass(active: boolean, className?: string) {
  return cn(
    "inline-flex h-5 shrink-0 items-center justify-center whitespace-nowrap rounded-full border px-2 text-[9px] font-semibold leading-none backdrop-blur transition-colors",
    active
      ? "border-violet-200 bg-violet-50 text-violet-700 shadow-sm dark:border-violet-400/35 dark:bg-violet-500/15 dark:text-violet-200"
      : "border-gray-200/90 bg-white/90 text-gray-600 hover:border-gray-300 hover:bg-white dark:border-white/12 dark:bg-white/8 dark:text-white/75 dark:hover:bg-white/12",
    className,
  );
}

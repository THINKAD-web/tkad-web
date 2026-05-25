import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const neonCardClass =
  "rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-white/5";

export const neonTitleClass =
  "text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl";

export const neonSubtitleClass = "text-gray-500 dark:text-white/60";

type Props = {
  children: ReactNode;
  className?: string;
};

/** 마케팅 서브페이지 공통 배경 */
export function NeonPageShell({ children, className }: Props) {
  return (
    <div
      className={cn(
        "min-h-screen bg-gray-50 dark:bg-[#020202]",
        className,
      )}
    >
      {children}
    </div>
  );
}

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** 매체 상세 `KpiChip` 과 동일한 스타일 */
export function NetworkKpiChip({
  label,
  value,
  valueClassName,
  className,
}: {
  label: string;
  value: ReactNode;
  valueClassName?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 bg-white px-3 py-2.5 dark:border-white/10 dark:bg-white/5",
        className,
      )}
    >
      <p className="tkad-type-note font-semibold uppercase tracking-widest text-gray-400 dark:text-white/40">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-display text-sm font-bold tabular-nums text-gray-900 dark:text-white",
          valueClassName,
        )}
      >
        {value}
      </p>
    </div>
  );
}

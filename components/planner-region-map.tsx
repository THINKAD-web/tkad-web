"use client";

import { cn } from "@/lib/utils";
import {
  PlannerNeonLabel,
  plannerNeon,
} from "@/components/planner/planner-neon-ui";

export type PlannerRegionChip = {
  id: string;
  label: string;
  count: number;
};

type Props = {
  selected: ReadonlySet<string>;
  /** 건수 > 0 인 광역 칩 (DB `regionMain` 기준) */
  regionOptions: PlannerRegionChip[];
  onToggle: (regionId: string) => void;
  title: string;
  hint: string;
  countLabel: (n: number) => string;
};

export function PlannerRegionMap({
  selected,
  regionOptions,
  onToggle,
  title,
  hint,
  countLabel,
}: Props) {
  return (
    <div className="space-y-3">
      <div>
        {title ? <PlannerNeonLabel>{title}</PlannerNeonLabel> : null}
        <p className={cn(title ? "mt-1" : "", plannerNeon.subtext)}>{hint}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {regionOptions.map((r) => {
          const active = selected.has(r.id);
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onToggle(r.id)}
              aria-pressed={active}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold transition-all touch-manipulation",
                active
                  ? "bg-violet-500 text-white shadow-sm shadow-violet-500/25"
                  : "dark:bg-white/10 bg-gray-100 text-gray-800 hover:bg-gray-200 dark:text-white/85 dark:hover:bg-white/15",
              )}
            >
              {r.label}
              <span
                className={cn(
                  "tabular-nums text-[10px] opacity-80",
                  active ? "text-white/90" : plannerNeon.subtext,
                )}
              >
                {countLabel(r.count)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

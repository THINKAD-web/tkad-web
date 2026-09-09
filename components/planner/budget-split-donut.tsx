"use client";

/**
 * Shared budget-split donut for planner brief summary and admin campaign builder compare.
 * Colors follow `lib/planner-chart-colors.ts` (same as PDF export).
 * Near-black (#1c1c1f) is swapped in dark mode for legibility on app surfaces.
 */

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import type { PlannerExportChartDatum } from "@/lib/planner-report-export/types";
import { plannerChartColor } from "@/lib/planner-chart-colors";
import { formatPlannerSharePct } from "@/lib/planner-logic";

/** #1c1c1f — 라이트 인쇄용 "디지털" 색. 다크 카드 배경과 거의 구분이 안 된다. */
const NEAR_BLACK_HEX = "#1c1c1f";
const DARK_SAFE_REPLACEMENT = "#9a99a0";

function segmentColor(
  colorKey: string | undefined,
  index: number,
  dark: boolean,
): string {
  const hex = plannerChartColor(colorKey, index);
  if (dark && hex.toLowerCase() === NEAR_BLACK_HEX) {
    return DARK_SAFE_REPLACEMENT;
  }
  return hex;
}

function useIsDarkTheme(): boolean {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);
  return mounted && resolvedTheme === "dark";
}

export function BudgetSplitDonut({
  data,
}: {
  data: readonly PlannerExportChartDatum[];
}) {
  const dark = useIsDarkTheme();
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total <= 0) return null;

  const R = 42;
  const C = 2 * Math.PI * R;
  const fracs = data.map((d) => d.value / total);
  const offsets = fracs.map(
    (_, i) => fracs.slice(0, i).reduce((a, b) => a + b, 0) * C,
  );

  return (
    <div className="flex items-center gap-4" data-testid="budget-split-donut">
      <svg width="108" height="108" viewBox="0 0 108 108" className="shrink-0">
        <g transform="translate(54,54) rotate(-90)">
          <circle r={R} fill="none" style={{ stroke: "var(--border)" }} strokeWidth="16" />
          {data.map((d, i) => (
            <circle
              key={d.label}
              r={R}
              fill="none"
              stroke={segmentColor(d.colorKey, i, dark)}
              strokeWidth="16"
              strokeDasharray={`${fracs[i]! * C} ${C - fracs[i]! * C}`}
              strokeDashoffset={-offsets[i]!}
            />
          ))}
        </g>
      </svg>
      <ul className="min-w-0 flex-1 space-y-1.5">
        {data.map((d, i) => {
          const pct = d.pct ?? (total > 0 ? (d.value / total) * 100 : 0);
          return (
            <li key={d.label} className="flex items-center gap-2 tkad-type-body">
              <span
                className="inline-block size-2.5 shrink-0 rounded-sm"
                style={{ background: segmentColor(d.colorKey, i, dark) }}
              />
              <span className="min-w-0 flex-1 truncate text-muted-foreground">
                {d.label}
              </span>
              <span className="shrink-0 font-semibold tabular-nums">
                {formatPlannerSharePct(pct)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

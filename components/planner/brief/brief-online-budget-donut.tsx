"use client";

/**
 * O-1 / PART3-5 — digital_only 결과 화면의 예산배분 도넛.
 * 색상은 `lib/planner-chart-colors.ts`의 딥 틸 SSOT 팔레트를 그대로 쓴다
 * (PR-6c `BriefResultSummary`의 `BudgetSplitDonut`과 같은 원리 — 근흑색
 * "ink"만 다크모드에서 중립 회색으로 바꿔 카드 배경과 구분되게 한다).
 */

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { CHART_SERIES_HEX, PLANNER_CHART_PALETTE } from "@/lib/planner-chart-colors";
import { formatPlannerSharePct } from "@/lib/planner-logic";
import type { ScoredOnlinePlatformGroup } from "@/lib/planner/recommend-online-catalog";

const DARK_SAFE_INK_REPLACEMENT = "#9a99a0";

function useIsDarkTheme(): boolean {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);
  return mounted && resolvedTheme === "dark";
}

function segmentColor(index: number, dark: boolean): string {
  const hex = PLANNER_CHART_PALETTE[index % PLANNER_CHART_PALETTE.length]!;
  if (dark && hex === CHART_SERIES_HEX.ink) return DARK_SAFE_INK_REPLACEMENT;
  return hex;
}

export function OnlineBudgetDonut({
  platforms,
  isKo,
}: {
  platforms: readonly ScoredOnlinePlatformGroup[];
  isKo: boolean;
}) {
  const dark = useIsDarkTheme();
  const total = platforms.reduce((s, p) => s + p.budgetMan, 0);
  if (total <= 0 || platforms.length === 0) return null;

  const R = 42;
  const C = 2 * Math.PI * R;
  const fracs = platforms.map((p) => p.budgetMan / total);
  const offsets = fracs.map((_, i) => fracs.slice(0, i).reduce((a, b) => a + b, 0) * C);

  return (
    <div className="flex items-center gap-4">
      <svg width="108" height="108" viewBox="0 0 108 108" className="shrink-0">
        <g transform="translate(54,54) rotate(-90)">
          <circle r={R} fill="none" style={{ stroke: "var(--border)" }} strokeWidth="16" />
          {platforms.map((p, i) => (
            <circle
              key={p.platform}
              r={R}
              fill="none"
              stroke={segmentColor(i, dark)}
              strokeWidth="16"
              strokeDasharray={`${fracs[i]! * C} ${C - fracs[i]! * C}`}
              strokeDashoffset={-offsets[i]!}
            />
          ))}
        </g>
      </svg>
      <ul className="min-w-0 flex-1 space-y-1.5">
        {platforms.map((p, i) => (
          <li key={p.platform} className="flex items-center gap-2 tkad-type-body">
            <span
              className="inline-block size-2.5 shrink-0 rounded-sm"
              style={{ background: segmentColor(i, dark) }}
            />
            <span className="min-w-0 flex-1 truncate text-muted-foreground">
              {p.platform}
            </span>
            <span className="shrink-0 font-semibold tabular-nums">
              {formatPlannerSharePct(p.budgetPct)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

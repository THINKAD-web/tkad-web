"use client";

import { cn } from "@/lib/utils";
import type { PlannerMapAnchorId } from "@/lib/planner/planner-regions";
import { PLANNER_MAP_ANCHOR_IDS } from "@/lib/planner/planner-regions";
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

type Zone = {
  id: PlannerMapAnchorId;
  d: string;
  cx: number;
  cy: number;
};

const MAP_ZONES: Zone[] = [
  {
    id: "seoul",
    cx: 150,
    cy: 118,
    d: "M 72 68 L 228 68 Q 248 118 218 168 L 92 168 Q 62 118 72 68 Z",
  },
  {
    id: "busan",
    cx: 238,
    cy: 232,
    d: "M 188 198 L 288 198 Q 308 238 278 278 L 198 278 Q 168 238 188 198 Z",
  },
  {
    id: "jeju",
    cx: 118,
    cy: 318,
    d: "M 58 292 L 178 292 Q 198 322 168 348 L 68 348 Q 38 322 58 292 Z",
  },
  {
    id: "national",
    cx: 268,
    cy: 96,
    d: "M 232 52 L 312 52 Q 322 96 302 138 L 242 138 Q 222 96 232 52 Z",
  },
];

export function PlannerRegionMap({
  selected,
  regionOptions,
  onToggle,
  title,
  hint,
  countLabel,
}: Props) {
  const labelById = new Map(regionOptions.map((o) => [o.id, o.label]));
  const countById = new Map(regionOptions.map((o) => [o.id, o.count]));

  const mapLabel = (id: PlannerMapAnchorId) =>
    labelById.get(id) ?? id;

  return (
    <div className="space-y-3">
      <div>
        <PlannerNeonLabel>{title}</PlannerNeonLabel>
        <p className={cn("mt-1", plannerNeon.subtext)}>{hint}</p>
      </div>
      <div
        className={cn(
          plannerNeon.card,
          "p-3 dark:bg-white/[0.03] bg-gray-50",
        )}
      >
        <svg
          viewBox="0 0 340 380"
          className="mx-auto h-auto w-full max-w-md touch-manipulation"
          role="img"
          aria-label={title}
        >
          <title>{title}</title>
          <rect width="340" height="380" className="tkad-planner-map-bg" />
          <text
            x="170"
            y="36"
            textAnchor="middle"
            className="tkad-planner-map-korea text-[11px] font-bold tracking-[0.22em]"
            style={{ fontFamily: "JetBrains Mono, monospace" }}
          >
            KOREA
          </text>
          {MAP_ZONES.map((z) => {
            const on = selected.has(z.id);
            const n = countById.get(z.id) ?? 0;
            const disabled = n <= 0;
            return (
              <g key={z.id} opacity={disabled ? 0.35 : 1}>
                <path
                  d={z.d}
                  className={cn(
                    "transition-colors",
                    disabled ? "cursor-not-allowed" : "cursor-pointer",
                    on
                      ? "tkad-planner-map-zone-on fill-violet-500 stroke-[3]"
                      : "tkad-planner-map-zone-off stroke-2",
                  )}
                  onClick={() => {
                    if (!disabled) onToggle(z.id);
                  }}
                />
                <text
                  x={z.cx}
                  y={z.cy - 6}
                  textAnchor="middle"
                  className={cn(
                    "pointer-events-none text-[11px] font-bold",
                    on ? "tkad-planner-map-label-active" : "tkad-planner-map-label-idle",
                  )}
                >
                  {mapLabel(z.id)}
                </text>
                <text
                  x={z.cx}
                  y={z.cy + 10}
                  textAnchor="middle"
                  className={cn(
                    "pointer-events-none text-[9px] font-bold tracking-[0.18em]",
                    on ? "tkad-planner-map-count-active" : "tkad-planner-map-count-idle",
                  )}
                  style={{ fontFamily: "JetBrains Mono, monospace" }}
                >
                  {countLabel(n)}
                </text>
              </g>
            );
          })}
        </svg>
        <ul className="mt-4 flex max-h-48 flex-wrap justify-center gap-2 overflow-y-auto overscroll-contain sm:max-h-none">
          {regionOptions.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => onToggle(r.id)}
                className={cn(
                  plannerNeon.selectChip,
                  "touch-manipulation",
                  selected.has(r.id)
                    ? plannerNeon.selectChipActive
                    : plannerNeon.selectChipIdle,
                )}
              >
                {r.label}
                <span
                  className={cn(
                    "ml-2 tabular-nums",
                    selected.has(r.id)
                      ? "dark:text-white/70 text-gray-600"
                      : plannerNeon.subtext,
                  )}
                >
                  ({countLabel(r.count)})
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

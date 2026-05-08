"use client";

import { cn } from "@/lib/utils";
import type { PlannerMapRegion } from "@/lib/planner-logic";
import { PLANNER_MAP_REGIONS } from "@/lib/planner-logic";

type Props = {
  selected: ReadonlySet<string>;
  counts: Record<string, number>;
  onToggle: (r: PlannerMapRegion) => void;
  labelFor: (r: PlannerMapRegion) => string;
  title: string;
  hint: string;
  countLabel: (n: number) => string;
};

type Zone = {
  id: PlannerMapRegion;
  /** rough hit path — simplified map */
  d: string;
  cx: number;
  cy: number;
};

const ZONES: Zone[] = [
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
  counts,
  onToggle,
  labelFor,
  title,
  hint,
  countLabel,
}: Props) {
  return (
    <div className="space-y-3">
      <div>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
          [ {title} ]
        </p>
        <p className="mt-1 font-mono text-[11px] tracking-tight text-muted-foreground">
          {hint}
        </p>
      </div>
      <div className="border-2 border-border bg-muted p-3">
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
            [ KOREA ]
          </text>
          {ZONES.map((z) => {
            const on = selected.has(z.id);
            const n = counts[z.id] ?? 0;
            return (
              <g key={z.id}>
                <path
                  d={z.d}
                  className={cn(
                    "cursor-pointer transition-colors",
                    on
                      ? "tkad-planner-map-zone-on fill-primary stroke-[3]"
                      : "tkad-planner-map-zone-off stroke-2",
                  )}
                  onClick={() => onToggle(z.id)}
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
                  {labelFor(z.id)}
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
        <ul className="mt-4 flex flex-wrap justify-center gap-0">
          {PLANNER_MAP_REGIONS.map((r) => (
            <li key={r} className="-mt-[2px] -ml-[2px]">
              <button
                type="button"
                onClick={() => onToggle(r)}
                className={cn(
                  "border-2 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] transition-colors",
                  selected.has(r)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:bg-muted",
                )}
              >
                {labelFor(r)}
                <span
                  className={cn(
                    "ml-2 tabular-nums",
                    selected.has(r) ? "text-primary-foreground/85" : "text-muted-foreground",
                  )}
                >
                  ({counts[r] ?? 0})
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

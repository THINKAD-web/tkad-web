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
    <div className="space-y-2">
      <div>
        <p className="text-sm font-bold text-navy">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      </div>
      <div className="rounded-2xl border border-navy/10 bg-gradient-to-b from-slate-50 to-white p-3 shadow-inner">
        <svg
          viewBox="0 0 340 380"
          className="mx-auto h-auto w-full max-w-md touch-manipulation"
          role="img"
          aria-label={title}
        >
          <title>{title}</title>
          <defs>
            <linearGradient id="plannerMapSea" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgb(214 222 235)" />
              <stop offset="100%" stopColor="rgb(230 235 245)" />
            </linearGradient>
          </defs>
          <rect width="340" height="380" rx="16" fill="url(#plannerMapSea)" />
          <text
            x="170"
            y="36"
            textAnchor="middle"
            className="fill-navy/35 text-[11px] font-semibold tracking-wide"
          >
            KOREA
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
                      ? "fill-navy/88 stroke-gold stroke-[2.5]"
                      : "fill-white/90 stroke-navy/20 stroke-[1.5] hover:fill-white hover:stroke-navy/40",
                  )}
                  onClick={() => onToggle(z.id)}
                />
                <text
                  x={z.cx}
                  y={z.cy - 6}
                  textAnchor="middle"
                  className={cn(
                    "pointer-events-none text-[11px] font-bold",
                    on ? "fill-white" : "fill-navy",
                  )}
                >
                  {labelFor(z.id)}
                </text>
                <text
                  x={z.cx}
                  y={z.cy + 10}
                  textAnchor="middle"
                  className={cn(
                    "pointer-events-none text-[9px] font-semibold",
                    on ? "fill-gold" : "fill-muted-foreground",
                  )}
                >
                  {countLabel(n)}
                </text>
              </g>
            );
          })}
        </svg>
        <ul className="mt-3 flex flex-wrap justify-center gap-2">
          {PLANNER_MAP_REGIONS.map((r) => (
            <li key={r}>
              <button
                type="button"
                onClick={() => onToggle(r)}
                className={cn(
                  "rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors",
                  selected.has(r)
                    ? "border-gold bg-navy text-white"
                    : "border-navy/15 bg-white text-navy hover:border-navy/30",
                )}
              >
                {labelFor(r)}
                <span className="ml-1 tabular-nums text-gold/90">
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

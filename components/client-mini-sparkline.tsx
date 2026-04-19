"use client";

import { useId } from "react";

type Props = {
  values: number[];
  className?: string;
  strokeClassName?: string;
};

/** Lightweight SVG sparkline for dashboard live metrics (no deps). */
export function ClientMiniSparkline({
  values,
  className = "",
  strokeClassName = "stroke-navy",
}: Props) {
  const rid = useId().replace(/:/g, "");
  const v = values.filter((n) => Number.isFinite(n));
  if (v.length < 2) {
    return (
      <div
        className={`flex h-12 items-center justify-center rounded-lg bg-slate-100/80 text-[10px] text-muted-foreground ${className}`}
      >
        —
      </div>
    );
  }

  const min = Math.min(...v);
  const max = Math.max(...v);
  const span = max - min || 1;
  const W = 120;
  const H = 44;
  const pad = 4;
  const innerW = W - pad * 2;
  const innerH = H - pad * 2;

  const pts = v.map((n, i) => {
    const x = pad + (i / (v.length - 1)) * innerW;
    const y = pad + innerH - ((n - min) / span) * innerH;
    return `${x},${y}`;
  });

  const d = `M ${pts.join(" L ")}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={`h-12 w-full max-w-[140px] ${className}`}
      aria-hidden
    >
      <defs>
        <linearGradient id={`sf-${rid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0d1b2e" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#c8913c" stopOpacity="0.04" />
        </linearGradient>
      </defs>
      <path
        d={`${d} L ${pad + innerW} ${pad + innerH} L ${pad} ${pad + innerH} Z`}
        fill={`url(#sf-${rid})`}
      />
      <path
        d={d}
        fill="none"
        className={strokeClassName}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

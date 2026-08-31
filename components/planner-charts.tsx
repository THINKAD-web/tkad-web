"use client";

import { BRAND_ACCENT } from "@/lib/brand-palette";

type ImpPoint = { month: number; impressions: number };
type RoiPoint = {
  month: number;
  conservative: number;
  expected: number;
  optimistic: number;
};

function formatCompact(n: number, isKo: boolean): string {
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return isKo ? `${v >= 10 ? Math.round(v) : v.toFixed(1)}M` : `${v >= 10 ? Math.round(v) : v.toFixed(1)}M`;
  }
  if (n >= 1000) {
    const v = n / 1000;
    return isKo ? `${v >= 100 ? Math.round(v) : v.toFixed(1)}k` : `${v >= 100 ? Math.round(v) : v.toFixed(1)}k`;
  }
  return String(Math.round(n));
}

export function PlannerImpressionsLineChart({
  data,
  isKo,
  title,
}: {
  data: ImpPoint[];
  isKo: boolean;
  title: string;
}) {
  if (data.length === 0) return null;

  const W = 560;
  const H = 220;
  const padL = 56;
  const padR = 12;
  const padT = 14;
  const padB = 36;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const maxY = Math.max(data[data.length - 1].impressions, 1);

  const pts = data.map((d, i) => {
    const x =
      padL +
      (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
    const y = padT + innerH - (d.impressions / maxY) * innerH;
    return { x, y, month: d.month, imp: d.impressions };
  });

  const lineD = pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");
  const areaD = `${lineD} L ${pts[pts.length - 1].x} ${padT + innerH} L ${pts[0].x} ${padT + innerH} Z`;

  const yTick1 = maxY;
  const yTick2 = Math.round(maxY * 0.5);
  const yTick3 = 0;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full min-w-[320px] max-h-64"
        role="img"
        aria-label={title}
      >
        <defs>
          <pattern id="plannerImpFill" width="6" height="6" patternUnits="userSpaceOnUse">
            <rect width="6" height="6" fill="#f5f5f5" />
            <path d="M 0 6 L 6 0" stroke="#000000" strokeOpacity="0.06" strokeWidth="1" />
          </pattern>
        </defs>
        {[yTick1, yTick2, yTick3].map((v, i) => {
          const yy =
            padT + innerH - (v / maxY) * innerH || padT + innerH;
          return (
            <g key={i}>
              <line
                x1={padL}
                x2={W - padR}
                y1={yy}
                y2={yy}
                stroke="rgba(0,0,0,0.12)"
                strokeDasharray="3 3"
                strokeWidth={1}
              />
              <text
                x={padL - 6}
                y={yy + 4}
                textAnchor="end"
                className="fill-muted-foreground tkad-type-note"
                style={{ fontFamily: "JetBrains Mono, monospace" }}
              >
                {formatCompact(v, isKo)}
              </text>
            </g>
          );
        })}
        <path d={areaD} fill="url(#plannerImpFill)" />
        <path
          d={lineD}
          fill="none"
          stroke="#000000"
          strokeWidth={2.5}
          strokeLinecap="butt"
          strokeLinejoin="miter"
        />
        {pts.map((p) => (
          <rect
            key={p.month}
            x={p.x - 4}
            y={p.y - 4}
            width={8}
            height={8}
            fill={BRAND_ACCENT}
            stroke="var(--foreground)"
            strokeWidth={2}
          />
        ))}
        {pts.map((p) => (
          <text
            key={`l-${p.month}`}
            x={p.x}
            y={H - 8}
            textAnchor="middle"
            className="fill-muted-foreground tkad-type-note font-bold"
            style={{ fontFamily: "JetBrains Mono, monospace" }}
          >
            {isKo ? `${p.month}M` : `M${p.month}`}
          </text>
        ))}
      </svg>
    </div>
  );
}

export function PlannerRoiLineChart({
  data,
  isKo,
  title,
  hint,
  legendConservative,
  legendExpected,
  legendOptimistic,
  roiUnit,
}: {
  data: RoiPoint[];
  isKo: boolean;
  title: string;
  hint: string;
  legendConservative: string;
  legendExpected: string;
  legendOptimistic: string;
  roiUnit: string;
}) {
  if (data.length === 0) return null;

  const all = data.flatMap((d) => [
    d.conservative,
    d.expected,
    d.optimistic,
  ]);
  const minY = Math.max(0.1, Math.min(...all) * 0.92);
  const maxY = Math.max(...all) * 1.08;
  const span = maxY - minY || 1;

  const W = 560;
  const H = 214;
  const padL = 48;
  const padR = 14;
  const padT = 28;
  const padB = 38;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const chartBottom = padT + innerH;

  const xFor = (i: number) =>
    padL +
    (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const yFor = (v: number) =>
    padT + innerH - ((v - minY) / span) * innerH;

  const line = (key: "conservative" | "expected" | "optimistic") =>
    data
      .map((d, i) => {
        const x = xFor(i);
        const y = yFor(d[key]);
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");

  return (
    <div className="w-full space-y-2 overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full min-w-[320px] max-h-72"
        role="img"
        aria-label={`${title}. ${hint}`}
      >
        <text
          x={W - padR}
          y={18}
          textAnchor="end"
          className="fill-muted-foreground tkad-type-note"
          style={{ fontFamily: "JetBrains Mono, monospace" }}
        >
          {roiUnit}
        </text>
        <line
          x1={padL}
          x2={W - padR}
          y1={chartBottom}
          y2={chartBottom}
          stroke="#000000"
          strokeWidth={2}
        />
        <path
          d={line("conservative")}
          fill="none"
          stroke="#737373"
          strokeWidth={2}
          strokeDasharray="6 4"
        />
        <path
          d={line("expected")}
          fill="none"
          stroke="#000000"
          strokeWidth={3}
        />
        <path
          d={line("optimistic")}
          fill="none"
          stroke={BRAND_ACCENT}
          strokeWidth={2.5}
        />
        {data.map((d, i) => (
          <text
            key={d.month}
            x={xFor(i)}
            y={H - 10}
            textAnchor="middle"
            className="fill-muted-foreground tkad-type-note font-bold"
            style={{ fontFamily: "JetBrains Mono, monospace" }}
          >
            {isKo ? `${d.month}M` : `M${d.month}`}
          </text>
        ))}
      </svg>
      <div className="flex flex-wrap gap-x-4 gap-y-1 tkad-type-label text-muted-foreground sm:tkad-type-caption">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-[2px] w-4 border-t-2 border-dashed border-muted-foreground" />
          {legendConservative}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-[3px] w-4 bg-foreground" />
          {legendExpected}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-[3px] w-4 bg-primary" />
          {legendOptimistic}
        </span>
      </div>
    </div>
  );
}

type BarPoint = { key: string; label: string; value: number };

function maxBar(points: BarPoint[]): number {
  return Math.max(1, ...points.map((p) => p.value));
}

function formatBarTick(n: number): string {
  if (n >= 1_000_000) return `${Math.round(n / 100_000) / 10}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  return String(Math.round(n));
}

export function PlannerDailyReachBarChart({
  data,
  title,
  valueLabel,
}: {
  data: BarPoint[];
  title: string;
  valueLabel: string;
}) {
  if (data.length === 0) return null;
  const W = 520;
  const H = 200;
  const padL = 8;
  const padR = 12;
  const padT = 16;
  const padB = 44;
  const gap = 14;
  const barW = Math.min(48, (W - padL - padR - gap * (data.length - 1)) / data.length);
  const innerH = H - padT - padB;
  const maxV = maxBar(data);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full min-w-[280px] max-h-56"
        role="img"
        aria-label={title}
      >
        <text x={padL} y={14} className="fill-foreground tkad-type-caption font-bold">
          {title}
        </text>
        {data.map((p, i) => {
          const x =
            padL + i * (barW + gap) + (W - padL - padR - data.length * barW - (data.length - 1) * gap) / 2;
          const h = (p.value / maxV) * innerH;
          const y = padT + innerH - h;
          return (
            <g key={p.key}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(h, 2)}
                fill="var(--foreground)"
              />
              <text
                x={x + barW / 2}
                y={y - 4}
                textAnchor="middle"
                className="fill-muted-foreground tkad-type-note font-bold"
                style={{ fontFamily: "JetBrains Mono, monospace" }}
              >
                {formatBarTick(p.value)}
              </text>
              <text
                x={x + barW / 2}
                y={H - 10}
                textAnchor="middle"
                className="fill-muted-foreground tkad-type-note font-bold"
                style={{ fontFamily: "JetBrains Mono, monospace" }}
              >
                {p.label}
              </text>
            </g>
          );
        })}
        <text
          x={W - padR}
          y={H - 2}
          textAnchor="end"
          className="fill-muted-foreground tkad-type-note"
          style={{ fontFamily: "JetBrains Mono, monospace" }}
        >
          {valueLabel}
        </text>
      </svg>
    </div>
  );
}

export function PlannerReachDonutChart({
  corePct,
  extendedPct,
  title,
  coreLabel,
  extendedLabel,
}: {
  corePct: number;
  extendedPct: number;
  title: string;
  coreLabel: string;
  extendedLabel: string;
}) {
  const r = 44;
  const stroke = 16;
  const c = 2 * Math.PI * r;
  const coreLen = (corePct / 100) * c;
  const extLen = (extendedPct / 100) * c;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
      <svg
        viewBox="0 0 120 120"
        className="h-32 w-32 shrink-0"
        role="img"
        aria-label={title}
      >
        <title>{title}</title>
        <g transform="translate(60,60) rotate(-90)">
          <circle
            r={r}
            fill="none"
            stroke="var(--muted)"
            strokeWidth={stroke}
          />
          <circle
            r={r}
            fill="none"
            stroke="var(--foreground)"
            strokeWidth={stroke}
            strokeDasharray={`${coreLen} ${c}`}
            strokeLinecap="butt"
          />
          <circle
            r={r}
            fill="none"
            stroke={BRAND_ACCENT}
            strokeWidth={stroke}
            strokeDasharray={`${extLen} ${c}`}
            strokeDashoffset={-coreLen}
            strokeLinecap="butt"
          />
        </g>
      </svg>
      <div className="space-y-2 text-sm">
        <p className="tkad-type-label text-muted-foreground">
          [ {title} ]
        </p>
        <div className="flex items-center gap-2 text-xs">
          <span className="h-3 w-3 shrink-0 bg-foreground" />
          <span className="text-muted-foreground">{coreLabel}</span>
          <span className="font-bold tabular-nums text-foreground">{corePct}%</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="h-3 w-3 shrink-0 bg-[color:var(--qp-accent)]" />
          <span className="text-muted-foreground">{extendedLabel}</span>
          <span className="font-bold tabular-nums text-foreground">{extendedPct}%</span>
        </div>
      </div>
    </div>
  );
}

const PIE_COLORS = [
  BRAND_ACCENT,
  "#1c1c1f",
  "#5a5a5e",
  "#10B981",
  "#737373",
];

export function PlannerBudgetPieChart({
  data,
  title,
  unitLabel,
}: {
  data: { key: string; label: string; pct: number }[];
  title: string;
  unitLabel: string;
}) {
  if (data.length === 0) return null;
  const cx = 70;
  const cy = 70;
  const r = 48;
  const start = -Math.PI / 2;
  const slices = data.map((d, i) => {
    const prevPct = data
      .slice(0, i)
      .reduce((sum, x) => sum + x.pct, 0);
    const sweep = (d.pct / 100) * 2 * Math.PI;
    const a0 = start + (prevPct / 100) * 2 * Math.PI;
    const a1 = a0 + sweep;
    const x0 = cx + r * Math.cos(a0);
    const y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    const large = sweep > Math.PI ? 1 : 0;
    const path = `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
    return { path, color: PIE_COLORS[i % PIE_COLORS.length], ...d };
  });

  return (
    <div className="w-full space-y-3">
      <p className="tkad-type-label text-muted-foreground">
        [ {title} ]
      </p>
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-8">
        <svg
          viewBox="0 0 140 140"
          className="h-36 w-36 shrink-0"
          role="img"
          aria-label={title}
        >
          {slices.map((s) => (
            <path
              key={s.key}
              d={s.path}
              fill={s.color}
              stroke="#000000"
              strokeWidth={2}
            />
          ))}
        </svg>
        <ul className="min-w-0 flex-1 space-y-2 text-xs">
          {slices.map((s) => (
            <li key={s.key} className="flex items-center gap-2">
              <span
                className="h-3 w-3 shrink-0 border-2 border-border"
                style={{ backgroundColor: s.color }}
              />
              <span className="text-muted-foreground">{s.label}</span>
              <span className="font-bold tabular-nums text-foreground">
                {s.pct}
                {unitLabel}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function PlannerCpmCompareChart({
  data,
  title,
  unitLabel,
}: {
  data: BarPoint[];
  title: string;
  unitLabel: string;
}) {
  if (data.length === 0) return null;
  const W = 520;
  const H = 200;
  const padL = 8;
  const padR = 12;
  const padT = 28;
  const padB = 40;
  const gap = 12;
  const barW = Math.min(
    52,
    (W - padL - padR - gap * (data.length - 1)) / data.length,
  );
  const innerH = H - padT - padB;
  const maxV = maxBar(data);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full min-w-[280px] max-h-56"
        role="img"
        aria-label={title}
      >
        <text x={padL} y={18} className="fill-foreground tkad-type-caption font-bold">
          {title}
        </text>
        {data.map((p, i) => {
          const x =
            padL +
            i * (barW + gap) +
            (W -
              padL -
              padR -
              data.length * barW -
              (data.length - 1) * gap) /
              2;
          const h = (p.value / maxV) * innerH;
          const y = padT + innerH - h;
          return (
            <g key={p.key}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(h, 2)}
                fill={BRAND_ACCENT}
              />
              <text
                x={x + barW / 2}
                y={y - 4}
                textAnchor="middle"
                className="fill-muted-foreground tkad-type-note font-bold"
                style={{ fontFamily: "JetBrains Mono, monospace" }}
              >
                {p.value >= 1000
                  ? `${Math.round(p.value / 100) / 10}k`
                  : Math.round(p.value)}
              </text>
              <text
                x={x + barW / 2}
                y={H - 10}
                textAnchor="middle"
                className="fill-muted-foreground tkad-type-note font-bold"
                style={{ fontFamily: "JetBrains Mono, monospace" }}
              >
                {p.label}
              </text>
            </g>
          );
        })}
        <text
          x={W - padR}
          y={H - 2}
          textAnchor="end"
          className="fill-muted-foreground tkad-type-note"
          style={{ fontFamily: "JetBrains Mono, monospace" }}
        >
          {unitLabel}
        </text>
      </svg>
    </div>
  );
}

export function PlannerMonthCompareChart({
  data,
  title,
  barLabels,
}: {
  data: { months: number; total: number }[];
  title: string;
  barLabels: string[];
}) {
  if (data.length === 0) return null;
  const W = 520;
  const H = 210;
  const padL = 52;
  const padR = 14;
  const padT = 20;
  const padB = 36;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const maxY = Math.max(1, ...data.map((d) => d.total));
  const barW = Math.min(56, (innerW - 24) / data.length - 16);
  const gap = (innerW - data.length * barW) / (data.length + 1);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full min-w-[280px] max-h-56"
        role="img"
        aria-label={title}
      >
        <text x={padL} y={14} className="fill-foreground tkad-type-caption font-bold">
          {title}
        </text>
        {[1, 0.5, 0].map((t, i) => {
          const v = Math.round(maxY * t);
          const yy = padT + innerH * (1 - t);
          return (
            <g key={i}>
              <line
                x1={padL}
                x2={W - padR}
                y1={yy}
                y2={yy}
                stroke="rgba(0,0,0,0.12)"
                strokeDasharray="3 3"
                strokeWidth={1}
              />
              <text
                x={padL - 6}
                y={yy + 4}
                textAnchor="end"
                className="fill-muted-foreground tkad-type-note"
                style={{ fontFamily: "JetBrains Mono, monospace" }}
              >
                {formatBarTick(v)}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const x = padL + gap + i * (barW + gap);
          const h = (d.total / maxY) * innerH;
          const y = padT + innerH - h;
          const isCurrent = i === data.length - 1; // 마지막(가장 긴 기간)을 강조
          return (
            <g key={d.months}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(h, 3)}
                fill={isCurrent ? BRAND_ACCENT : "var(--foreground)"}
              />
              <text
                x={x + barW / 2}
                y={H - 10}
                textAnchor="middle"
                className="fill-muted-foreground tkad-type-note font-bold"
                style={{ fontFamily: "JetBrains Mono, monospace" }}
              >
                {barLabels[i] ?? `${d.months}M`}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

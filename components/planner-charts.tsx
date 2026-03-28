"use client";

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
          <linearGradient id="plannerImpFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(26, 42, 108)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="rgb(232, 213, 181)" stopOpacity="0.05" />
          </linearGradient>
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
                className="stroke-slate-200"
                strokeWidth={1}
              />
              <text
                x={padL - 6}
                y={yy + 4}
                textAnchor="end"
                className="fill-muted-foreground text-[9px]"
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
          className="stroke-navy"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {pts.map((p) => (
          <circle
            key={p.month}
            cx={p.x}
            cy={p.y}
            r={4}
            className="fill-gold stroke-navy"
            strokeWidth={1.5}
          />
        ))}
        {pts.map((p) => (
          <text
            key={`l-${p.month}`}
            x={p.x}
            y={H - 8}
            textAnchor="middle"
            className="fill-muted-foreground text-[9px] font-medium"
          >
            {isKo ? `${p.month}개월` : `M${p.month}`}
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
          className="fill-muted-foreground text-[8px]"
        >
          {roiUnit}
        </text>
        <line
          x1={padL}
          x2={W - padR}
          y1={chartBottom}
          y2={chartBottom}
          className="stroke-slate-200"
          strokeWidth={1}
        />
        <path
          d={line("conservative")}
          fill="none"
          className="stroke-slate-400"
          strokeWidth={2}
          strokeDasharray="6 4"
          strokeLinecap="round"
        />
        <path
          d={line("expected")}
          fill="none"
          className="stroke-navy"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <path
          d={line("optimistic")}
          fill="none"
          className="stroke-gold-dark"
          strokeWidth={2}
          strokeLinecap="round"
        />
        {data.map((d, i) => (
          <text
            key={d.month}
            x={xFor(i)}
            y={H - 10}
            textAnchor="middle"
            className="fill-muted-foreground text-[9px] font-medium"
          >
            {isKo ? `${d.month}개월` : `M${d.month}`}
          </text>
        ))}
      </svg>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground sm:text-xs">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 border-t-2 border-dashed border-slate-400" />
          {legendConservative}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-navy" />
          {legendExpected}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-gold-dark" />
          {legendOptimistic}
        </span>
      </div>
    </div>
  );
}

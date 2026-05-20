import type { DataSourceAttribution } from "@/lib/data-source-types";
import { confidenceLabel } from "@/lib/data-source-types";

export function DataConfidenceBadge({
  attribution,
  isKo = true,
}: {
  attribution: DataSourceAttribution;
  isKo?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
      {confidenceLabel(attribution, isKo)}
    </span>
  );
}

export function OverallConfidenceBar({
  score,
  isKo = true,
}: {
  score: number;
  isKo?: boolean;
}) {
  const color =
    score >= 85 ? "bg-emerald-500" : score >= 70 ? "bg-amber-500" : "bg-orange-500";
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-muted-foreground">
          {isKo ? "데이터 신뢰도" : "Data confidence"}
        </span>
        <span className="font-bold text-foreground">{score}%</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

export function DataAttributionList({
  attributions,
  isKo = true,
}: {
  attributions: DataSourceAttribution[];
  isKo?: boolean;
}) {
  if (!attributions.length) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {attributions.map((a) => (
        <li key={a.sourceId}>
          <DataConfidenceBadge attribution={a} isKo={isKo} />
        </li>
      ))}
    </ul>
  );
}

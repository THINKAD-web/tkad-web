import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  score: number;
  isKo: boolean;
  className?: string;
  compact?: boolean;
};

export function MediaTrustScoreBadge({
  score,
  isKo,
  className,
  compact = false,
}: Props) {
  const tone =
    score >= 80
      ? "text-emerald-700 dark:text-emerald-300 border-emerald-400/40 bg-emerald-400/10"
      : score >= 60
        ? "text-violet-700 dark:text-violet-300 border-violet-400/40 bg-violet-400/10"
        : "text-muted-foreground border-border/60 bg-muted/40";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-semibold tabular-nums",
        tone,
        compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        className,
      )}
    >
      <ShieldCheck className={cn(compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
      {isKo ? `신뢰도 ${score}점` : `Trust ${score}`}
    </span>
  );
}

type ExecutionProps = {
  count: number;
  monthsAgo: number | null;
  isKo: boolean;
  className?: string;
};

export function MediaExecutionSummary({
  count,
  monthsAgo,
  isKo,
  className,
}: ExecutionProps) {
  const recentLabel =
    monthsAgo == null
      ? isKo
        ? "최근 집행 이력 없음"
        : "No recent flights"
      : monthsAgo <= 0
        ? isKo
          ? "최근 집행 1개월 이내"
          : "Flights within 1 month"
        : isKo
          ? `최근 집행 ${monthsAgo}개월 전`
          : `Last flight ${monthsAgo} mo ago`;

  return (
    <p className={cn("text-sm text-muted-foreground", className)}>
      {isKo
        ? `누적 집행 ${count}회 · ${recentLabel}`
        : `${count} flights · ${recentLabel}`}
    </p>
  );
}

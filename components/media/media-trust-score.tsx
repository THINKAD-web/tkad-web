import { ShieldCheck } from "lucide-react";
import {
  trustGradeLabel,
  trustGradeToneClass,
  trustScoreExplanation,
  trustScoreToGrade,
} from "@/lib/media-trust";
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
  const grade = trustScoreToGrade(score);
  const tone = trustGradeToneClass(grade);
  const gradeLabel = trustGradeLabel(grade, isKo);
  const explanation = trustScoreExplanation(isKo);

  return (
    <span
      title={explanation}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-semibold tabular-nums",
        tone,
        compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        className,
      )}
    >
      <ShieldCheck className={cn(compact ? "h-3 w-3" : "h-3.5 w-3.5")} aria-hidden />
      <span>
        {isKo ? `${gradeLabel} · ${score}점` : `${gradeLabel} · ${score}`}
      </span>
      <span className="sr-only">{explanation}</span>
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

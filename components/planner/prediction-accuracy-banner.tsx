import type { PlatformPredictionAccuracy } from "@/lib/prediction-accuracy";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";

type Props = {
  accuracy: PlatformPredictionAccuracy;
  isKo: boolean;
  className?: string;
};

export function PredictionAccuracyBanner({
  accuracy,
  isKo,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "tkad-glass-surface relative overflow-hidden rounded-[22px] border border-emerald-400/25 px-4 py-3",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06] tkad-neon-grid"
      />
      <div className="relative flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 font-display text-[10px] font-black uppercase tracking-[0.18em] text-emerald-400">
            {isKo ? "예측 정확도" : "Prediction accuracy"}
          </span>
          <p className="text-sm font-semibold tabular-nums text-foreground">
            {isKo
              ? `예측 정확도: ${accuracy.accuracyPct}%`
              : `Prediction accuracy: ${accuracy.accuracyPct}%`}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          {isKo
            ? `(최근 ${accuracy.sampleSize}건 집행 실측 데이터 기반)`
            : `(Based on ${accuracy.sampleSize} recent verified flights)`}
        </p>
        <Link
          href="/guarantee"
          className="text-xs font-medium text-emerald-400 underline-offset-2 hover:underline"
        >
          {isKo ? "성과 보증 정책 →" : "Performance guarantee policy →"}
        </Link>
      </div>
    </div>
  );
}

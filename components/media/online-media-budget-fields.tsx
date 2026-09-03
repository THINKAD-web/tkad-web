"use client";

import { mediaPriceOnInquiryLabel } from "@/lib/media-price-format";
import type { MediaItem } from "@/lib/media-data";
import { onlinePricingLabel } from "@/lib/pricing/online-performance-estimate";
import { hasOnlinePricingSpec } from "@/lib/pricing-unavailable";
import { cn } from "@/lib/utils";

type Props = {
  media: MediaItem;
  budgetWon: number;
  onBudgetChange: (won: number) => void;
  isKo: boolean;
  inputCls?: string;
  compact?: boolean;
  className?: string;
};

export function defaultOnlineBudgetWon(media: MediaItem): number {
  return media.onlineSpec?.minBudget ?? 1_000_000;
}

export function isOnlineBudgetBelowMin(
  media: MediaItem,
  budgetWon: number,
): boolean {
  const spec = media.onlineSpec;
  if (!spec || !hasOnlinePricingSpec(media)) return false;
  const minBudget = spec.minBudget ?? 0;
  return minBudget > 0 && budgetWon > 0 && budgetWon < minBudget;
}

export function OnlineMediaBudgetFields({
  media,
  budgetWon,
  onBudgetChange,
  isKo,
  inputCls,
  compact = false,
  className,
}: Props) {
  const spec = media.onlineSpec;
  const calculable = hasOnlinePricingSpec(media);
  const belowMin = isOnlineBudgetBelowMin(media, budgetWon);
  const locale = isKo ? "ko-KR" : "en-US";

  if (!calculable || !spec) {
    return (
      <p className={cn("text-xs text-muted-foreground", className)}>
        {mediaPriceOnInquiryLabel(isKo ? "ko" : "en")}
      </p>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {!compact ? (
        <p className="text-xs text-muted-foreground">
          {onlinePricingLabel(spec)}
        </p>
      ) : null}
      <label className="block space-y-1">
        <span className="text-xs font-semibold text-muted-foreground">
          {isKo ? "월 예산" : "Monthly budget"}
        </span>
        <input
          type="number"
          min={spec.minBudget ?? 100_000}
          step={100_000}
          value={budgetWon}
          onChange={(e) => {
            const n = Number(e.target.value);
            onBudgetChange(Number.isFinite(n) && n > 0 ? Math.round(n) : 0);
          }}
          className={inputCls}
        />
      </label>
      {belowMin ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
          {isKo
            ? `최소 집행금액 ${spec.minBudget.toLocaleString(locale)}원 이상 입력해 주세요.`
            : `Enter at least ₩${spec.minBudget.toLocaleString(locale)} (minimum budget).`}
        </p>
      ) : null}
    </div>
  );
}

"use client";

import { Minus, Plus } from "lucide-react";
import type { MediaItem } from "@/lib/media-data";
import { getQuantityBounds } from "@/lib/media-quantity";
import {
  formatPlannerQuantityLabel,
  shouldShowPlannerQuantityStepper,
} from "@/lib/planner/planner-media-quantity";
import { getQuantityUnitMode } from "@/lib/media-quantity";
import { cn } from "@/lib/utils";

type Props = {
  media: MediaItem;
  units: number;
  onChange: (units: number) => void;
  isKo: boolean;
  compact?: boolean;
  className?: string;
};

export function PlannerMediaQuantityStepper({
  media,
  units,
  onChange,
  isKo,
  compact = false,
  className,
}: Props) {
  if (getQuantityUnitMode(media) !== "unit") return null;
  if (!shouldShowPlannerQuantityStepper(media)) return null;

  const bounds = getQuantityBounds(media);
  const clamp = (v: number) => {
    const hi = bounds.max ?? Number.MAX_SAFE_INTEGER;
    return Math.min(hi, Math.max(bounds.min, Math.round(v)));
  };
  const label = formatPlannerQuantityLabel(media, units, isKo);
  const atMin = units <= bounds.min;
  const atMax = bounds.max != null && units >= bounds.max;

  return (
    <div
      className={cn("flex items-center gap-2", className)}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {!compact ? (
        <span className="text-[11px] font-medium text-muted-foreground">
          {isKo ? "수량" : "Qty"}
        </span>
      ) : null}
      <div
        className="inline-flex items-center rounded-lg border border-violet-400/35 bg-white/90 dark:border-violet-400/25 dark:bg-white/5"
        role="group"
        aria-label={isKo ? "매체 수량" : "Media quantity"}
      >
        <button
          type="button"
          onClick={() => onChange(clamp(units - 1))}
          disabled={atMin}
          className="flex h-7 w-7 items-center justify-center rounded-l-lg text-violet-700 transition-colors hover:bg-violet-500/10 disabled:opacity-40 dark:text-violet-200"
          aria-label={isKo ? "수량 감소" : "Decrease quantity"}
        >
          <Minus className="h-3.5 w-3.5" aria-hidden />
        </button>
        <span className="min-w-[3.5rem] px-1 text-center text-xs font-semibold tabular-nums text-foreground">
          {label}
        </span>
        <button
          type="button"
          onClick={() => onChange(clamp(units + 1))}
          disabled={atMax}
          className="flex h-7 w-7 items-center justify-center rounded-r-lg text-violet-700 transition-colors hover:bg-violet-500/10 disabled:opacity-40 dark:text-violet-200"
          aria-label={isKo ? "수량 증가" : "Increase quantity"}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}

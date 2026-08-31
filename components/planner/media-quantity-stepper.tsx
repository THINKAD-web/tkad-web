"use client";

import { Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import type { MediaItem } from "@/lib/media-data";
import {
  getQuantityBounds,
  getQuantityUnitMode,
  isPerUnitGradePriceOptions,
} from "@/lib/media-quantity";
import {
  formatPlannerQuantityLabel,
  shouldShowPlannerQuantityStepper,
} from "@/lib/planner/planner-media-quantity";
import { cn } from "@/lib/utils";

type Props = {
  media: MediaItem;
  units: number;
  onChange: (units: number) => void;
  isKo: boolean;
  compact?: boolean;
  /** 직접 숫자 입력 (내 플랜·어드민) */
  editable?: boolean;
  className?: string;
};

export function PlannerMediaQuantityStepper({
  media,
  units,
  onChange,
  isKo,
  compact = false,
  editable = false,
  className,
}: Props) {
  const gradePerUnit = isPerUnitGradePriceOptions(media);
  if (getQuantityUnitMode(media) !== "unit" && !gradePerUnit) return null;
  if (!shouldShowPlannerQuantityStepper(media)) return null;

  const bounds = getQuantityBounds(media);
  const clamp = (v: number) => {
    const hi = bounds.max ?? Number.MAX_SAFE_INTEGER;
    return Math.min(hi, Math.max(bounds.min, Math.round(v)));
  };
  const label = formatPlannerQuantityLabel(media, units, isKo);
  const atMin = units <= bounds.min;
  const atMax = bounds.max != null && units >= bounds.max;
  const [draft, setDraft] = useState(String(units));

  useEffect(() => {
    setDraft(String(units));
  }, [units]);

  const commitDraft = () => {
    const parsed = Number(draft.replace(/,/g, ""));
    if (!Number.isFinite(parsed)) {
      setDraft(String(units));
      return;
    }
    onChange(clamp(parsed));
  };

  return (
    <div
      className={cn("flex items-center gap-2", className)}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {!compact ? (
        <span className="tkad-type-caption font-medium text-muted-foreground">
          {isKo ? "수량" : "Qty"}
        </span>
      ) : null}
      <div
        className="inline-flex items-center rounded-lg border border-[color:var(--qp-accent)]/35 bg-white/90 dark:border-[color:var(--qp-accent)]/25 dark:bg-white/5"
        role="group"
        aria-label={isKo ? "매체 수량" : "Media quantity"}
      >
        <button
          type="button"
          onClick={() => onChange(clamp(units - 1))}
          disabled={atMin}
          className="flex h-7 w-7 items-center justify-center rounded-l-lg text-[color:var(--qp-accent)] transition-colors hover:bg-[color:var(--qp-accent)]/10 disabled:opacity-40 dark:text-[color:var(--qp-accent)]"
          aria-label={isKo ? "수량 감소" : "Decrease quantity"}
        >
          <Minus className="h-3.5 w-3.5" aria-hidden />
        </button>
        {editable ? (
          <input
            type="text"
            inputMode="numeric"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitDraft}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitDraft();
                (e.target as HTMLInputElement).blur();
              }
            }}
            className="h-7 w-14 border-x border-[color:var(--qp-accent)]/35 bg-white px-1 text-center tkad-type-title tabular-nums text-foreground outline-none focus:ring-1 focus:ring-[color:var(--qp-accent-ring)] dark:border-[color:var(--qp-accent)]/25 dark:bg-white/5"
            aria-label={isKo ? "수량 직접 입력" : "Quantity input"}
          />
        ) : (
          <span className="min-w-[3.5rem] px-1 text-center tkad-type-title tabular-nums text-foreground">
            {label}
          </span>
        )}
        <button
          type="button"
          onClick={() => onChange(clamp(units + 1))}
          disabled={atMax}
          className="flex h-7 w-7 items-center justify-center rounded-r-lg text-[color:var(--qp-accent)] transition-colors hover:bg-[color:var(--qp-accent)]/10 disabled:opacity-40 dark:text-[color:var(--qp-accent)]"
          aria-label={isKo ? "수량 증가" : "Increase quantity"}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}

"use client";

import type { MediaItem } from "@/lib/media-data";
import { formatCatalogPriceFieldWon } from "@/lib/media-price-format";
import {
  plannerPackageOptions,
  type CampaignMediaPriceOptionIndex,
  type CampaignMediaQuantities,
} from "@/lib/planner/planner-media-quantity";
import { getQuantityUnitMode, isPerUnitGradePriceOptions } from "@/lib/media-quantity";
import { isNetworkCatalogItem } from "@/lib/matching-network-helpers";
import { cn } from "@/lib/utils";

type Props = {
  media: MediaItem;
  isKo: boolean;
  quantities: CampaignMediaQuantities;
  priceOptionIndex: CampaignMediaPriceOptionIndex;
  onQuantityChange: (units: number) => void;
  onPriceOptionChange: (index: number) => void;
  compact?: boolean;
  className?: string;
};

function optionPrimaryLabel(
  label: string,
  isNetwork: boolean,
  compact: boolean,
): string {
  if (!compact) return label;
  if (isNetwork) return label.split(" · ")[0]?.trim() || label;
  return label;
}

export function PlannerMediaPackagePicker({
  media,
  isKo,
  quantities,
  priceOptionIndex,
  onQuantityChange,
  onPriceOptionChange,
  compact = false,
  className,
}: Props) {
  const options = plannerPackageOptions(media, isKo);
  if (options.length === 0) return null;

  const isNetwork = isNetworkCatalogItem(media);
  const isGrade = isPerUnitGradePriceOptions(media);
  const selectedUnits = quantities[media.id];
  const selectedOptIdx = priceOptionIndex[media.id] ?? 0;
  const showInlinePrice =
    getQuantityUnitMode(media) === "package" && isNetwork ? false : !compact;

  return (
    <div
      className={cn(compact ? "min-w-0 space-y-1" : "space-y-1.5", className)}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {!compact ? (
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {isKo
            ? isNetwork
              ? "패키지 구좌"
              : isGrade
                ? "등급"
                : "패키지 옵션"
            : isNetwork
              ? "Package slot"
              : isGrade
                ? "Grade"
                : "Package option"}
        </p>
      ) : null}
      <div
        className={cn(
          "flex min-w-0 gap-1",
          compact
            ? "max-w-full overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            : "flex-wrap gap-1.5",
        )}
        role="listbox"
        aria-label={isKo ? "패키지 선택" : "Package selection"}
      >
        {options.map((opt, i) => {
          const selected = isNetwork
            ? selectedUnits === opt.units
            : selectedOptIdx === i;
          const primary = optionPrimaryLabel(opt.label, isNetwork, compact);
          return (
            <button
              key={opt.key}
              type="button"
              role="option"
              aria-selected={selected}
              onClick={() => {
                if (isNetwork && opt.units != null) {
                  onQuantityChange(opt.units);
                } else {
                  onPriceOptionChange(i);
                  if (isGrade && opt.units != null && opt.units > 0) {
                    onQuantityChange(opt.units);
                  }
                }
              }}
              className={cn(
                "shrink-0 rounded-md border text-left transition-colors",
                compact
                  ? "max-w-[9.5rem] px-2 py-1 text-[10px] leading-tight"
                  : "max-w-full rounded-lg px-2.5 py-1.5 text-[11px] leading-snug",
                selected
                  ? "border-violet-500 bg-violet-500/15 font-semibold text-violet-800 dark:text-violet-100"
                  : compact
                    ? "border-violet-400/20 bg-white/70 font-medium text-foreground/85 hover:border-violet-400/40 dark:bg-white/5"
                    : "border-violet-400/25 bg-white/80 text-foreground hover:border-violet-400/50 dark:bg-white/5",
              )}
            >
              <span className="block truncate font-medium">{primary}</span>
              {!compact && !isNetwork && opt.description && selected ? (
                <span className="mt-0.5 block text-[10px] font-normal text-muted-foreground line-clamp-1">
                  {opt.description}
                </span>
              ) : null}
              {showInlinePrice ? (
                <span
                  className={cn(
                    "block tabular-nums text-muted-foreground",
                    compact ? "text-[9px]" : "mt-0.5 text-[10px]",
                  )}
                >
                  {formatCatalogPriceFieldWon(
                    opt.price,
                    isKo ? "ko-KR" : "en-US",
                  )}
                </span>
              ) : null}
              {compact && !isNetwork ? (
                <span className="block truncate text-[9px] tabular-nums text-muted-foreground">
                  {formatCatalogPriceFieldWon(
                    opt.price,
                    isKo ? "ko-KR" : "en-US",
                  )}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import type { MediaItem } from "@/lib/media-data";
import { formatCatalogPriceFieldWon } from "@/lib/media-price-format";
import {
  plannerPackageOptions,
  type CampaignMediaPriceOptionIndex,
  type CampaignMediaQuantities,
} from "@/lib/planner/planner-media-quantity";
import { getQuantityUnitMode } from "@/lib/media-quantity";
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
  const selectedUnits = quantities[media.id];
  const selectedOptIdx = priceOptionIndex[media.id] ?? 0;

  return (
    <div
      className={cn("space-y-1.5", className)}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {!compact ? (
        <p className="text-[11px] font-medium text-muted-foreground">
          {isKo
            ? isNetwork
              ? "패키지 구좌"
              : "패키지 옵션"
            : isNetwork
              ? "Package slot"
              : "Package option"}
        </p>
      ) : null}
      <div
        className="flex flex-wrap gap-1.5"
        role="listbox"
        aria-label={isKo ? "패키지 선택" : "Package selection"}
      >
        {options.map((opt, i) => {
          const selected = isNetwork
            ? selectedUnits === opt.units
            : selectedOptIdx === i;
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
                }
              }}
              className={cn(
                "max-w-full rounded-lg border px-2.5 py-1.5 text-left text-[11px] leading-snug transition-colors",
                selected
                  ? "border-violet-500 bg-violet-500/15 font-semibold text-violet-800 dark:text-violet-100"
                  : "border-violet-400/25 bg-white/80 text-foreground hover:border-violet-400/50 dark:bg-white/5",
              )}
            >
              <span className="block font-medium">{opt.label}</span>
              {!isNetwork && opt.description ? (
                <span className="mt-0.5 block text-[10px] font-normal text-muted-foreground line-clamp-2">
                  {opt.description}
                </span>
              ) : null}
              {getQuantityUnitMode(media) === "package" && isNetwork ? null : (
                <span className="mt-0.5 block tabular-nums text-muted-foreground">
                  {formatCatalogPriceFieldWon(
                    opt.price,
                    isKo ? "ko-KR" : "en-US",
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import type { MediaItem } from "@/lib/media-data";
import { getQuantityUnitMode, isPerUnitGradePriceOptions } from "@/lib/media-quantity";
import { PlannerMediaPackagePicker } from "@/components/planner/media-package-picker";
import { PlannerMediaQuantityStepper } from "@/components/planner/media-quantity-stepper";
import {
  plannerUnitsForMedia,
  shouldShowPlannerQuantityControl,
  type CampaignMediaPriceOptionIndex,
  type CampaignMediaQuantities,
} from "@/lib/planner/planner-media-quantity";
import { cn } from "@/lib/utils";

type Props = {
  media: MediaItem;
  isKo: boolean;
  quantities: CampaignMediaQuantities;
  priceOptionIndex: CampaignMediaPriceOptionIndex;
  onQuantityChange: (units: number) => void;
  onPriceOptionChange: (index: number) => void;
  compact?: boolean;
  quantityEditable?: boolean;
  className?: string;
};

export function PlannerMediaQuantityControl({
  media,
  isKo,
  quantities,
  priceOptionIndex,
  onQuantityChange,
  onPriceOptionChange,
  compact = false,
  quantityEditable = false,
  className,
}: Props) {
  if (!shouldShowPlannerQuantityControl(media)) return null;

  if (isPerUnitGradePriceOptions(media)) {
    return (
      <div className={cn(compact ? "min-w-0 space-y-1.5" : "space-y-2", className)}>
        <PlannerMediaPackagePicker
          media={media}
          isKo={isKo}
          quantities={quantities}
          priceOptionIndex={priceOptionIndex}
          onQuantityChange={onQuantityChange}
          onPriceOptionChange={onPriceOptionChange}
          compact={compact}
        />
        <PlannerMediaQuantityStepper
          media={media}
          units={plannerUnitsForMedia(media, quantities)}
          onChange={onQuantityChange}
          isKo={isKo}
          compact={compact}
          editable={quantityEditable}
        />
      </div>
    );
  }

  if (getQuantityUnitMode(media) === "package") {
    return (
      <PlannerMediaPackagePicker
        media={media}
        isKo={isKo}
        quantities={quantities}
        priceOptionIndex={priceOptionIndex}
        onQuantityChange={onQuantityChange}
        onPriceOptionChange={onPriceOptionChange}
        compact={compact}
        className={className}
      />
    );
  }

  return (
    <PlannerMediaQuantityStepper
      media={media}
      units={plannerUnitsForMedia(media, quantities)}
      onChange={onQuantityChange}
      isKo={isKo}
      compact={compact}
      editable={quantityEditable}
      className={cn(className)}
    />
  );
}

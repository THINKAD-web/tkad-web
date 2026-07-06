"use client";

import type { MediaItem } from "@/lib/media-data";
import { getQuantityUnitMode } from "@/lib/media-quantity";
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
  className,
}: Props) {
  if (!shouldShowPlannerQuantityControl(media)) return null;

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
      className={cn(className)}
    />
  );
}

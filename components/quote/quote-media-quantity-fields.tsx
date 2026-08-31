"use client";

import type { MediaItem } from "@/lib/media-data";
import { resolveMediaQuantity } from "@/lib/media-quantity";
import { PlannerMediaQuantityControl } from "@/components/planner/planner-media-quantity-control";
import {
  shouldShowPlannerQuantityControl,
  type CampaignMediaPriceOptionIndex,
  type CampaignMediaQuantities,
} from "@/lib/planner/planner-media-quantity";

type NetworkOpt = { units: number; regionScope: string };

type Props = {
  media: MediaItem;
  isKo: boolean;
  checked: boolean;
  mediaQuantities: CampaignMediaQuantities;
  mediaPriceOptionIndex: CampaignMediaPriceOptionIndex;
  networkQuoteOptions: Record<string, NetworkOpt>;
  usePackagePeriodByMediaId: Record<string, boolean>;
  onMediaQuantityChange: (mediaId: string, units: number) => void;
  onPriceOptionChange: (media: MediaItem, idx: number) => void;
  onNetworkQuoteOptionsChange: (
    mediaId: string,
    patch: Partial<NetworkOpt>,
  ) => void;
  onPackagePeriodToggle: (mediaId: string, checked: boolean) => void;
  packagePeriodMeta: { bundleDays: number; periodText: string } | null;
  networkRegionLabel: string;
  networkRegionAllLabel: string;
  packagePeriodOnlyLabel: string;
  quantityEditable?: boolean;
};

export function QuoteMediaQuantityFields({
  media,
  isKo,
  checked,
  mediaQuantities,
  mediaPriceOptionIndex,
  networkQuoteOptions,
  usePackagePeriodByMediaId,
  onMediaQuantityChange,
  onPriceOptionChange,
  onNetworkQuoteOptionsChange,
  onPackagePeriodToggle,
  packagePeriodMeta,
  networkRegionLabel,
  networkRegionAllLabel,
  packagePeriodOnlyLabel,
  quantityEditable = false,
}: Props) {
  if (!checked) return null;

  const isNw = media.catalogSource === "network";
  const showQuantity = shouldShowPlannerQuantityControl(media);
  const nwOpt = networkQuoteOptions[media.id];

  const quantitiesForControl: CampaignMediaQuantities = isNw
    ? {
        [media.id]:
          nwOpt?.units ?? resolveMediaQuantity(media, mediaQuantities[media.id]),
      }
    : mediaQuantities;

  if (!showQuantity && !isNw && !packagePeriodMeta) return null;

  return (
    <div className="space-y-3 border-2 border-border bg-muted p-3 text-sm">
      {showQuantity ? (
        <PlannerMediaQuantityControl
          media={media}
          isKo={isKo}
          quantities={quantitiesForControl}
          priceOptionIndex={mediaPriceOptionIndex}
          onQuantityChange={(units) => {
            if (isNw) {
              onNetworkQuoteOptionsChange(media.id, { units });
            } else {
              onMediaQuantityChange(media.id, units);
            }
          }}
          onPriceOptionChange={(index) => onPriceOptionChange(media, index)}
          quantityEditable={quantityEditable}
        />
      ) : null}

      {isNw ? (
        <div>
          <label className="mb-2 block tkad-type-label text-accent">
            [ {networkRegionLabel} ]
          </label>
          <select
            className="w-full border-2 border-border bg-card px-2 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none"
            value={nwOpt?.regionScope ?? "all"}
            onChange={(e) =>
              onNetworkQuoteOptionsChange(media.id, {
                regionScope: e.target.value,
              })
            }
          >
            <option value="all">{networkRegionAllLabel}</option>
            {(media.networkRegionLabels ?? []).map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {!isNw && packagePeriodMeta ? (
        <label className="flex cursor-pointer items-start gap-2 text-xs text-foreground">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={usePackagePeriodByMediaId[media.id] === true}
            onChange={(e) => onPackagePeriodToggle(media.id, e.target.checked)}
          />
          <span>
            {packagePeriodOnlyLabel.replace(
              "{period}",
              packagePeriodMeta.periodText,
            )}
          </span>
        </label>
      ) : null}
    </div>
  );
}

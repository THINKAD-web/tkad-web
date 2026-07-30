import type { MediaItem } from "@/lib/media-data";
import {
  isPerUnitGradePriceOptions,
  resolveMediaQuantity,
} from "@/lib/media-quantity";
import { syncQuantityAfterPackagePick } from "@/lib/planner/planner-media-quantity";

/**
 * 견적 진입 시 가격 옵션 인덱스에 맞는 수량.
 * 등급형 버스: 옵션 `units` 우선, 없으면 bounds 기본값.
 */
export function resolveQuoteUnitsForPriceOption(
  media: MediaItem,
  priceOptionIndex: number,
  currentUnits?: number,
): number {
  if (!isPerUnitGradePriceOptions(media)) {
    return resolveMediaQuantity(media, currentUnits);
  }
  const opt = media.priceOptions?.[priceOptionIndex];
  if (opt) {
    return syncQuantityAfterPackagePick(media, {
      key: `opt:${priceOptionIndex}`,
      label: opt.label,
      price: opt.price,
      units: opt.units,
    });
  }
  return resolveMediaQuantity(media, currentUnits);
}

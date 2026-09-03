import { canonicalCatalogChannel } from "@/lib/catalog-channel";
import type { HomeCatalogMediaItem } from "@/lib/media-catalog-types";
import type { MediaItem } from "@/lib/media-data";
import { resolvePlanCartItemRegionKey } from "@/lib/plan-cart-report/regional-breakdown";
import type { PlanCartAddedFrom, PlanCartItem } from "@/lib/plan-cart";
import {
  hasOnlinePricingSpec,
  isOnlineCatalogMedia,
} from "@/lib/pricing-unavailable";
import { defaultQuoteWizardOnlineBudgetWon } from "@/lib/quote-wizard-pricing";

type PlanCartOnlineBudgetSource = Pick<
  MediaItem,
  "catalogChannel" | "onlineSpec"
>;

/** Online calculable — seed monthly budget at add time (browse/detail; wizard handoff in commit 2). */
export function planCartOnlineLineTotalWonSnapshot(
  source: PlanCartOnlineBudgetSource,
): number | undefined {
  if (!isOnlineCatalogMedia(source)) return undefined;
  if (!hasOnlinePricingSpec(source)) return undefined;
  return defaultQuoteWizardOnlineBudgetWon(source);
}

export function planCartItemFromCatalog(
  item: Pick<
    HomeCatalogMediaItem,
    | "id"
    | "name"
    | "type"
    | "region"
    | "price"
    | "thumbnailUrl"
    | "catalogChannel"
    | "onlineSpec"
  >,
  addedFrom: PlanCartAddedFrom,
): Omit<PlanCartItem, "addedAt"> {
  const lineTotalWon = planCartOnlineLineTotalWonSnapshot(item);
  return {
    mediaId: item.id,
    mediaName: item.name,
    mediaType: item.type ?? "",
    catalogChannel: canonicalCatalogChannel(item.catalogChannel),
    ...(lineTotalWon != null ? { lineTotalWon } : {}),
    region: item.region ?? "",
    price: item.price ?? 0,
    thumbnailUrl: item.thumbnailUrl,
    addedFrom,
  };
}

export function planCartItemFromMediaItem(
  item: Pick<
    MediaItem,
    | "id"
    | "name"
    | "type"
    | "region"
    | "regionMain"
    | "city"
    | "district"
    | "location"
    | "locationEn"
    | "nameEn"
    | "regionSub"
    | "regionZone"
    | "price"
    | "sampleImages"
    | "catalogChannel"
    | "onlineSpec"
  >,
  addedFrom: PlanCartAddedFrom,
): Omit<PlanCartItem, "addedAt"> {
  const regionKey = resolvePlanCartItemRegionKey(item.region ?? "", item as MediaItem);
  const lineTotalWon = planCartOnlineLineTotalWonSnapshot(item);
  return {
    mediaId: item.id,
    mediaName: item.name,
    mediaType: item.type ?? "",
    catalogChannel: canonicalCatalogChannel(item.catalogChannel),
    ...(lineTotalWon != null ? { lineTotalWon } : {}),
    region: regionKey,
    price: item.price ?? 0,
    thumbnailUrl: item.sampleImages?.[0],
    addedFrom,
  };
}

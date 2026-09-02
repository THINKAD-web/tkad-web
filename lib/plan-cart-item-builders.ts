import { canonicalCatalogChannel } from "@/lib/catalog-channel";
import type { HomeCatalogMediaItem } from "@/lib/media-catalog-types";
import type { MediaItem } from "@/lib/media-data";
import { resolvePlanCartItemRegionKey } from "@/lib/plan-cart-report/regional-breakdown";
import type { PlanCartAddedFrom, PlanCartItem } from "@/lib/plan-cart";

export function planCartItemFromCatalog(
  item: Pick<
    HomeCatalogMediaItem,
    "id" | "name" | "type" | "region" | "price" | "thumbnailUrl"
  >,
  addedFrom: PlanCartAddedFrom,
): Omit<PlanCartItem, "addedAt"> {
  return {
    mediaId: item.id,
    mediaName: item.name,
    mediaType: item.type ?? "",
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
  >,
  addedFrom: PlanCartAddedFrom,
): Omit<PlanCartItem, "addedAt"> {
  const regionKey = resolvePlanCartItemRegionKey(item.region ?? "", item as MediaItem);
  return {
    mediaId: item.id,
    mediaName: item.name,
    mediaType: item.type ?? "",
    catalogChannel: canonicalCatalogChannel(item.catalogChannel),
    region: regionKey,
    price: item.price ?? 0,
    thumbnailUrl: item.sampleImages?.[0],
    addedFrom,
  };
}

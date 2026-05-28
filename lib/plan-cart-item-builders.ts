import type { HomeCatalogMediaItem } from "@/lib/media-catalog";
import type { MediaItem } from "@/lib/media-data";
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
    "id" | "name" | "type" | "region" | "price" | "sampleImages"
  >,
  addedFrom: PlanCartAddedFrom,
): Omit<PlanCartItem, "addedAt"> {
  return {
    mediaId: item.id,
    mediaName: item.name,
    mediaType: item.type ?? "",
    region: item.region ?? "",
    price: item.price ?? 0,
    thumbnailUrl: item.sampleImages?.[0],
    addedFrom,
  };
}

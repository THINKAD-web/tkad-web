import type { Media } from "@prisma/client";

/** Fields that appear on browse/list/landing grids or filter chips. */
const LIST_CACHE_FIELD_NAMES = [
  "name",
  "nameEn",
  "slug",
  "type",
  "region",
  "district",
  "location",
  "locationEn",
  "price",
  "pricePeriod",
  "availability",
  "visibility",
  "status",
  "country",
  "subCategory",
  "regionSub",
  "image",
  "isFeatured",
  "isPopular",
  "featuredOrder",
  "popularOrder",
  "popularityScore",
  "isVerified",
  "networkId",
] as const satisfies ReadonlyArray<keyof Media>;

export type MediaListCacheSnapshot = Pick<
  Media,
  (typeof LIST_CACHE_FIELD_NAMES)[number]
>;

export function mediaListCacheSnapshot(
  media: MediaListCacheSnapshot,
): MediaListCacheSnapshot {
  const out = {} as MediaListCacheSnapshot;
  for (const key of LIST_CACHE_FIELD_NAMES) {
    out[key] = media[key];
  }
  return out;
}

/** True when browse/list/filter ISR should regen (price, slug, region, etc.). */
export function mediaListCacheNeedsInvalidation(
  before: MediaListCacheSnapshot,
  after: MediaListCacheSnapshot,
): boolean {
  for (const key of LIST_CACHE_FIELD_NAMES) {
    if (!Object.is(before[key], after[key])) return true;
  }
  return false;
}

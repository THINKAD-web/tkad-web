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
  // Browse chip filters (discovery filter/counts) — were missing from this
  // gate, so bulk taxonomy migrations and manual edits to these fields
  // silently skipped list invalidation. See media-catalog-list-dto.ts.
  "mediaMainCategory",
  "mediaSubCategory",
  "regionMain",
] as const satisfies ReadonlyArray<keyof Media>;

/** Array field compared by content, not reference (Object.is would always be true/false-positive). */
const LIST_CACHE_ARRAY_FIELD_NAMES = ["mediaCategory"] as const satisfies ReadonlyArray<
  keyof Media
>;

export type MediaListCacheSnapshot = Pick<
  Media,
  (typeof LIST_CACHE_FIELD_NAMES)[number] | (typeof LIST_CACHE_ARRAY_FIELD_NAMES)[number]
>;

export function mediaListCacheSnapshot(
  media: MediaListCacheSnapshot,
): MediaListCacheSnapshot {
  const out = {} as MediaListCacheSnapshot;
  for (const key of LIST_CACHE_FIELD_NAMES) {
    out[key] = media[key];
  }
  for (const key of LIST_CACHE_ARRAY_FIELD_NAMES) {
    out[key] = media[key];
  }
  return out;
}

function arrayFieldChanged(before: unknown, after: unknown): boolean {
  const b = Array.isArray(before) ? before : [];
  const a = Array.isArray(after) ? after : [];
  if (b.length !== a.length) return true;
  const bSorted = [...b].sort();
  const aSorted = [...a].sort();
  return bSorted.some((v, i) => v !== aSorted[i]);
}

/** True when browse/list/filter ISR should regen (price, slug, region, etc.). */
export function mediaListCacheNeedsInvalidation(
  before: MediaListCacheSnapshot,
  after: MediaListCacheSnapshot,
): boolean {
  for (const key of LIST_CACHE_FIELD_NAMES) {
    if (!Object.is(before[key], after[key])) return true;
  }
  for (const key of LIST_CACHE_ARRAY_FIELD_NAMES) {
    if (arrayFieldChanged(before[key], after[key])) return true;
  }
  return false;
}

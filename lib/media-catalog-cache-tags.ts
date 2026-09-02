/** Browse/list ISR + filter counts — admin list-field edits invalidate this tag. */
export const PUBLIC_MEDIA_CATALOG_LIST_CACHE_TAG = "public-media-catalog-list";

/**
 * Per-slug media detail Data Cache (`public-media-detail-v1`).
 * Invalidated on media save; does NOT share the list tag so list-only ISR pages
 * are not regen'd when detail-only fields change.
 */
export const PUBLIC_MEDIA_CATALOG_DETAIL_CACHE_TAG = "public-media-catalog-detail";

/** @deprecated Use LIST tag. Kept for one release so external scripts stay compatible. */
export const PUBLIC_MEDIA_CATALOG_CACHE_TAG = PUBLIC_MEDIA_CATALOG_LIST_CACHE_TAG;

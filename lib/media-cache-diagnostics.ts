/**
 * Cross-request cache miss logging (loader invoked = cache miss or TTL expiry).
 * Enable with MEDIA_CACHE_DEBUG=1 in Preview/Production logs.
 */
export function logMediaCacheMiss(
  source:
    | "public-media-catalog"
    | "public-media-catalog-list"
    | "daily-engagement-scores"
    | "trust-badge-context",
  detail?: Record<string, unknown>,
): void {
  if (process.env.MEDIA_CACHE_DEBUG !== "1") return;
  console.info("[media-cache] miss", {
    source,
    at: new Date().toISOString(),
    ...detail,
  });
}

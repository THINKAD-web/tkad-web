import { MEDIA_MAP_TILE_RESOURCE_HINTS } from "@/lib/media-map/tile-resource-hints";

/**
 * Route-scoped tile host hints — Next hoists `<link>` into `<head>`.
 * PR-7: shorten DNS/TLS before Leaflet tile requests.
 */
export function MediaMapTileResourceHints() {
  return (
    <>
      {MEDIA_MAP_TILE_RESOURCE_HINTS.map(({ href, preconnect }) =>
        preconnect ? (
          <link
            key={`preconnect-${href}`}
            rel="preconnect"
            href={href}
            crossOrigin="anonymous"
          />
        ) : (
          <link key={`dns-${href}`} rel="dns-prefetch" href={href} />
        ),
      )}
    </>
  );
}

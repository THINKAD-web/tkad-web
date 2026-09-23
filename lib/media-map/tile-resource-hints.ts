/**
 * Basemap tile hosts for `/media/map` — keep in sync with
 * `publicMapTileUrlForTheme` / OSM fallback in `public-dark-map-config.ts`.
 */

export type MediaMapTileResourceHint = {
  href: string;
  /** preconnect when true; otherwise dns-prefetch only */
  preconnect: boolean;
};

/** Theme unknown at SSR — hint all hosts in active rotation (low cost). */
export const MEDIA_MAP_TILE_RESOURCE_HINTS: MediaMapTileResourceHint[] = [
  { href: "https://api.vworld.kr", preconnect: true },
  { href: "https://a.basemaps.cartocdn.com", preconnect: true },
  { href: "https://b.basemaps.cartocdn.com", preconnect: false },
  { href: "https://c.basemaps.cartocdn.com", preconnect: false },
  { href: "https://d.basemaps.cartocdn.com", preconnect: false },
  { href: "https://a.tile.openstreetmap.org", preconnect: true },
  { href: "https://b.tile.openstreetmap.org", preconnect: false },
];

import {
  VWORLD_WMTS_LAYERS,
  VWORLD_TILE_ATTRIBUTION,
  isVWorldTilesConfigured,
  vworldWmtsTileUrl,
} from "@/lib/public-vworld-map-config";

/** 공개(사용자) 지도 — VWorld(키 있을 때) / Carto fallback */

export const PUBLIC_MAP_TILE_SUBDOMAINS = "abcd";

/** CARTO raster basemaps — https://carto.com/basemaps/apikey/ (free tier, domain-bound) */
export function getCartoBasemapsApiKey(): string | null {
  const key = process.env.NEXT_PUBLIC_CARTO_BASEMAPS_API_KEY?.trim();
  return key || null;
}

export function isCartoBasemapsApiKeyConfigured(): boolean {
  return getCartoBasemapsApiKey() != null;
}

/** Append `?key=` (or `&key=`) — without a key CARTO shows "API KEY REQUIRED" on tiles. */
export function withCartoBasemapsApiKey(tileUrl: string): string {
  const key = getCartoBasemapsApiKey();
  if (!key) return tileUrl;
  const sep = tileUrl.includes("?") ? "&" : "?";
  return `${tileUrl}${sep}key=${encodeURIComponent(key)}`;
}

/** CARTO key 미설정 시 워터마크 대신 OSM 사용 (Aug 2026 CARTO raster key 정책). */
export const OPENSTREETMAP_TILE_URL =
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

export const OPENSTREETMAP_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export function resolvePublicRasterBasemapUrl(cartoUrl: string): string {
  if (isCartoBasemapsApiKeyConfigured()) {
    return withCartoBasemapsApiKey(cartoUrl);
  }
  return OPENSTREETMAP_TILE_URL;
}

export function resolvePublicRasterBasemapAttribution(
  cartoAttribution: string,
): string {
  if (isCartoBasemapsApiKeyConfigured()) {
    return cartoAttribution;
  }
  return OPENSTREETMAP_TILE_ATTRIBUTION;
}

/** Carto 타일 URL — 한 줄만 바꿔 dark / light / voyager 비교 */
export const PUBLIC_MAP_TILE_URLS = {
  voyager:
    "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
  light:
    "https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png",
  light_nolabels:
    "https://{s}.basemaps.cartocdn.com/rastertiles/light_nolabels/{z}/{x}/{y}{r}.png",
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  dark_nolabels:
    "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
} as const;

export type PublicMapTilePreset = keyof typeof PUBLIC_MAP_TILE_URLS;

/** ← 여기만 수정: voyager | light | dark (themeAware 미사용 경로) */
export const PUBLIC_MAP_TILE_PRESET: PublicMapTilePreset = "voyager";

/** @deprecated 이름 유지 — 실제 URL은 PRESET 에 따름 */
export const PUBLIC_DARK_MAP_TILE_URL = resolvePublicRasterBasemapUrl(
  PUBLIC_MAP_TILE_URLS[PUBLIC_MAP_TILE_PRESET],
);

/**
 * next-themes `resolvedTheme` 기준 — /media/map themeAware 타일.
 * - Light: `NEXT_PUBLIC_VWORLD_API_KEY` 있으면 VWorld Base, 없으면 Carto voyager
 * - Dark: VWorld dark 타일 없음 → Carto dark 유지
 */
export function publicMapTileUrlForTheme(
  resolvedTheme: string | undefined,
): string {
  if (resolvedTheme === "dark") {
    return resolvePublicRasterBasemapUrl(PUBLIC_MAP_TILE_URLS.dark);
  }
  const vworld = vworldWmtsTileUrl(VWORLD_WMTS_LAYERS.base);
  if (vworld) return vworld;
  return resolvePublicRasterBasemapUrl(PUBLIC_MAP_TILE_URLS.voyager);
}

export function publicMapTileAttributionForTheme(
  resolvedTheme: string | undefined,
): string {
  if (resolvedTheme !== "dark" && isVWorldTilesConfigured()) {
    return VWORLD_TILE_ATTRIBUTION;
  }
  return resolvePublicRasterBasemapAttribution(
    '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  );
}

export function isPublicMapLightTileFromTheme(
  resolvedTheme: string | undefined,
): boolean {
  return resolvedTheme !== "dark";
}

/** @deprecated PUBLIC_MAP_TILE_SUBDOMAINS 와 동일 */
export const PUBLIC_DARK_MAP_TILE_SUBDOMAINS = PUBLIC_MAP_TILE_SUBDOMAINS;

export function isPublicMapLightTile(): boolean {
  return (
    PUBLIC_MAP_TILE_PRESET === "voyager" ||
    PUBLIC_MAP_TILE_PRESET === "light" ||
    PUBLIC_MAP_TILE_PRESET === "light_nolabels"
  );
}

export const PUBLIC_DARK_MAP_DEFAULT_CENTER = {
  lat: 37.5665,
  lng: 126.978,
} as const;

/** Kakao level(1=근접) → Leaflet zoom(큰 값=근접) */
export function kakaoLevelToLeafletZoom(
  kakaoLevel?: number,
  fallback = 10,
): number {
  if (kakaoLevel == null || !Number.isFinite(kakaoLevel)) return fallback;
  return Math.max(5, Math.min(18, Math.round(19 - kakaoLevel * 1.2)));
}

/** Leaflet zoom → Kakao level (역변환, URL state 호환) */
export function leafletZoomToKakaoLevel(leafletZoom: number): number {
  return Math.max(1, Math.min(14, Math.round((19 - leafletZoom) / 1.2)));
}

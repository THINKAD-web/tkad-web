/** 공개(사용자) 지도 — Carto 타일 (홈 히어로·/media/map·매체 상세 공통) */

export const PUBLIC_MAP_TILE_SUBDOMAINS = "abcd";

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
export const PUBLIC_DARK_MAP_TILE_URL =
  PUBLIC_MAP_TILE_URLS[PUBLIC_MAP_TILE_PRESET];

/** next-themes `resolvedTheme` 기준 — /media/map themeAware 타일 */
export function publicMapTileUrlForTheme(
  resolvedTheme: string | undefined,
): string {
  return resolvedTheme === "dark"
    ? PUBLIC_MAP_TILE_URLS.dark_nolabels
    : PUBLIC_MAP_TILE_URLS.light_nolabels;
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

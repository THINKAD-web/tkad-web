/** 공개(사용자) 지도 — Carto 다크 타일 (홈 히어로·/media/map·매체 상세 공통) */
export const PUBLIC_DARK_MAP_TILE_URL =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

export const PUBLIC_DARK_MAP_TILE_SUBDOMAINS = "abcd";

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

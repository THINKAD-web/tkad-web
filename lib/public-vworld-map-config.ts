/**
 * VWorld Open API WMTS 타일 — `/media/map` 등 공개 지도.
 *
 * 발급: https://www.vworld.kr → Open API → 인증키
 * Vercel `NEXT_PUBLIC_VWORLD_API_KEY`:
 *   - Development / Preview: 개발키 등록됨 → 라이트 모드 VWorld Base
 *   - Production: **운영키 미등록 (TODO)** — 운영키 발급 후 Production env 에만 추가·재배포.
 *     키 없으면 `publicMapTileUrlForTheme` 가 Carto voyager 로 폴백.
 *
 * 다크 모드: VWorld Base 타일에 dark 변형이 없어 dark 테마는 Carto dark 유지.
 */

export const VWORLD_WMTS_LAYERS = {
  /** 일반 지도 (한국어 POI·도로명) */
  base: "Base",
  /** 위성 */
  satellite: "Satellite",
  /** 하이브리드 */
  hybrid: "Hybrid",
  /** 백지도 (midnight 등) — 라벨 없음, 오버레이용 */
  white: "white",
  /** 야간(제한적) — 공식 명칭 midnight, POI 라벨 없음 */
  midnight: "midnight",
} as const;

export type VWorldWmtsLayer = (typeof VWORLD_WMTS_LAYERS)[keyof typeof VWORLD_WMTS_LAYERS];

export function getVWorldApiKey(): string | null {
  const key = process.env.NEXT_PUBLIC_VWORLD_API_KEY?.trim();
  return key || null;
}

export function isVWorldTilesConfigured(): boolean {
  return getVWorldApiKey() != null;
}

/** Leaflet XYZ — `https://api.vworld.kr/req/wmts/1.0.0/{key}/Base/{z}/{y}/{x}.png` */
export function vworldWmtsTileUrl(
  layer: VWorldWmtsLayer = VWORLD_WMTS_LAYERS.base,
): string | null {
  const key = getVWorldApiKey();
  if (!key) return null;
  return `https://api.vworld.kr/req/wmts/1.0.0/${encodeURIComponent(key)}/${layer}/{z}/{y}/{x}.png`;
}

export const VWORLD_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.vworld.kr/">VWorld</a> &copy; <a href="https://www.ngii.go.kr/">NGII</a>';

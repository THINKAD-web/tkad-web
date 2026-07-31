import type { MapBounds } from "@/components/public-map/map-types";

/** Pan/zoom 후 자동 영역 재조회 debounce (ms) */
export const MAP_AUTO_SEARCH_DEBOUNCE_MS = 800;

/** searchedBounds 대비 현재 bounds 변화가 이 비율(0–1) 이상일 때만 자동 재조회 */
export const MAP_AUTO_SEARCH_BOUNDS_CHANGE_THRESHOLD = 0.1;

function mapBoundsArea(b: MapBounds): number {
  const latSpan = b.neLat - b.swLat;
  const lngSpan = b.neLng - b.swLng;
  if (!Number.isFinite(latSpan) || !Number.isFinite(lngSpan)) return 0;
  return Math.abs(latSpan * lngSpan);
}

function mapBoundsIntersection(
  a: MapBounds,
  b: MapBounds,
): MapBounds | null {
  const swLat = Math.max(a.swLat, b.swLat);
  const swLng = Math.max(a.swLng, b.swLng);
  const neLat = Math.min(a.neLat, b.neLat);
  const neLng = Math.min(a.neLng, b.neLng);
  if (swLat >= neLat || swLng >= neLng) return null;
  return { swLat, swLng, neLat, neLng };
}

/**
 * reference(마지막 검색 영역)와 current(현재 뷰포트)의 면적 변화율.
 * 각 bounds 기준으로 잃은(새로 생긴) 면적 비율 중 큰 값을 반환 (0 = 동일, 1 = 완전 불일치).
 */
export function mapBoundsViewportChangeRatio(
  reference: MapBounds,
  current: MapBounds,
): number {
  const refArea = mapBoundsArea(reference);
  const curArea = mapBoundsArea(current);
  if (refArea <= 0 || curArea <= 0) return 1;

  const intersection = mapBoundsIntersection(reference, current);
  if (!intersection) return 1;

  const interArea = mapBoundsArea(intersection);
  const refLoss = 1 - interArea / refArea;
  const curLoss = 1 - interArea / curArea;
  return Math.max(refLoss, curLoss);
}

export function mapBoundsChangeExceedsThreshold(
  reference: MapBounds,
  current: MapBounds,
  threshold = MAP_AUTO_SEARCH_BOUNDS_CHANGE_THRESHOLD,
): boolean {
  return (
    mapBoundsViewportChangeRatio(reference, current) >= threshold
  );
}

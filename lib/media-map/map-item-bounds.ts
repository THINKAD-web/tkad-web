import type { MapBounds } from "@/components/public-map/map-types";

type MapCoordItem = {
  lat: number;
  lng: number;
  installLocations?: Array<{ lat: number; lng: number }>;
};

function isValidCoord(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

/** 검색 결과 매체·설치 지점으로 bounding box 계산 */
export function boundsFromMapCoordItems(
  items: MapCoordItem[],
): MapBounds | null {
  let swLat = Infinity;
  let swLng = Infinity;
  let neLat = -Infinity;
  let neLng = -Infinity;

  for (const item of items) {
    const points =
      item.installLocations && item.installLocations.length > 0
        ? item.installLocations
        : [{ lat: item.lat, lng: item.lng }];

    for (const p of points) {
      if (!isValidCoord(p.lat, p.lng)) continue;
      swLat = Math.min(swLat, p.lat);
      swLng = Math.min(swLng, p.lng);
      neLat = Math.max(neLat, p.lat);
      neLng = Math.max(neLng, p.lng);
    }
  }

  if (!Number.isFinite(swLat)) return null;
  return { swLat, swLng, neLat, neLng };
}

export function mapBoundsIntersect(a: MapBounds, b: MapBounds): boolean {
  return !(
    a.neLat < b.swLat ||
    a.swLat > b.neLat ||
    a.neLng < b.swLng ||
    a.swLng > b.neLng
  );
}

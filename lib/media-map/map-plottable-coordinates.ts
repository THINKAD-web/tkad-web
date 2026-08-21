import type { MediaItem } from "@/lib/media-data";
import { PUBLIC_DARK_MAP_DEFAULT_CENTER } from "@/lib/public-dark-map-config";

/** `prismaMediaToMediaItem` DB null 폴백 좌표 (서울시청) */
export function isCatalogFallbackCoordinate(lat: number, lng: number): boolean {
  return (
    Math.abs(lat - PUBLIC_DARK_MAP_DEFAULT_CENTER.lat) < 1e-4 &&
    Math.abs(lng - PUBLIC_DARK_MAP_DEFAULT_CENTER.lng) < 1e-4
  );
}

export function isValidPlotCoordinate(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    !(lat === 0 && lng === 0) &&
    !isCatalogFallbackCoordinate(lat, lng)
  );
}

/** 지도 핀 표시 가능 여부 (폴백·0,0 제외, installLocations 우선) */
export function mediaItemHasPlottableMapCoordinates(
  media: Pick<
    MediaItem,
    "lat" | "lng" | "installLocations" | "coordinatesAreFallback"
  >,
): boolean {
  const installs = media.installLocations ?? [];
  if (installs.some((p) => isValidPlotCoordinate(p.lat, p.lng))) {
    return true;
  }
  if (media.coordinatesAreFallback) return false;
  return isValidPlotCoordinate(media.lat, media.lng);
}

export function mediaItemLocationUnknown(
  media: Pick<
    MediaItem,
    "lat" | "lng" | "installLocations" | "coordinatesAreFallback"
  >,
): boolean {
  return !mediaItemHasPlottableMapCoordinates(media);
}

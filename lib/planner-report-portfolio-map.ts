import type { MapMarker } from "@/components/public-map/map-types";
import type { MapBounds } from "@/components/public-map/map-types";
import type { MediaItem } from "@/lib/media-data";
import { mapMarkersForMediaDetail } from "@/lib/media-detail-map-markers";
import {
  isCatalogFallbackCoordinate,
  isValidPlotCoordinate,
  mediaItemHasPlottableMapCoordinates,
} from "@/lib/media-map/map-plottable-coordinates";

export {
  isCatalogFallbackCoordinate,
  mediaItemHasPlottableMapCoordinates,
} from "@/lib/media-map/map-plottable-coordinates";

/** 단일 매체 → 유효 핀만 (폴백 좌표 마커 제외) */
export function mapMarkersForPlottableMedia(
  media: MediaItem,
  isKo: boolean,
): MapMarker[] {
  if (!mediaItemHasPlottableMapCoordinates(media)) return [];
  return mapMarkersForMediaDetail(media, isKo).filter((m) =>
    isValidPlotCoordinate(m.lat, m.lng),
  );
}

export type PlannerReportPortfolioMapData = {
  markers: MapMarker[];
  /** 핀 1개 이상인 매체 수 */
  mappableMediaCount: number;
  /** 총 핀(위치) 수 */
  locationCount: number;
  /** 좌표 미등록·폴백으로 핀 생략된 매체 수 */
  unmappedCount: number;
};

export function buildPlannerReportPortfolioMap(
  portfolio: readonly MediaItem[],
  isKo: boolean,
): PlannerReportPortfolioMapData {
  const markers: MapMarker[] = [];
  let mappableMediaCount = 0;
  let unmappedCount = 0;

  for (const media of portfolio) {
    const pins = mapMarkersForPlottableMedia(media, isKo);
    if (pins.length > 0) {
      mappableMediaCount += 1;
      markers.push(...pins);
    } else {
      unmappedCount += 1;
    }
  }

  return {
    markers,
    mappableMediaCount,
    locationCount: markers.length,
    unmappedCount,
  };
}

export function boundsFromMapMarkers(markers: MapMarker[]): MapBounds | null {
  if (markers.length === 0) return null;
  let swLat = Infinity;
  let swLng = Infinity;
  let neLat = -Infinity;
  let neLng = -Infinity;
  for (const m of markers) {
    if (!isValidPlotCoordinate(m.lat, m.lng)) continue;
    swLat = Math.min(swLat, m.lat);
    swLng = Math.min(swLng, m.lng);
    neLat = Math.max(neLat, m.lat);
    neLng = Math.max(neLng, m.lng);
  }
  if (!Number.isFinite(swLat)) return null;
  if (markers.length === 1) {
    const pad = 0.012;
    return {
      swLat: swLat - pad,
      swLng: swLng - pad,
      neLat: neLat + pad,
      neLng: neLng + pad,
    };
  }
  return { swLat, swLng, neLat, neLng };
}

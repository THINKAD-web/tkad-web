import type { MediaItem } from "@/lib/media-data";
import {
  formatNetworkServiceRegionLabel,
  formatServiceRegionLabel,
} from "@/lib/geo/korea-sgg-coverage";
import { mediaItemHasPlottableMapCoordinates } from "@/lib/media-map/map-plottable-coordinates";

export type MapDisplayMode = "pin" | "service_region" | "location_unknown";

export function isNetworkCatalogItem(
  media: Pick<MediaItem, "type" | "catalogSource">,
): boolean {
  return (
    media.type === "network" ||
    media.catalogSource === "network" ||
    media.type?.toLowerCase().includes("network") === true
  );
}

/** 지도 핀 vs 서비스 지역 vs 좌표 결손 분류 */
export function resolveMapDisplayMode(
  media: Pick<
    MediaItem,
    | "type"
    | "catalogSource"
    | "lat"
    | "lng"
    | "installLocations"
    | "coordinatesAreFallback"
  >,
): MapDisplayMode {
  if (media.type === "mobile") return "service_region";
  if (isNetworkCatalogItem(media)) {
    return mediaItemHasPlottableMapCoordinates(media)
      ? "pin"
      : "service_region";
  }
  return mediaItemHasPlottableMapCoordinates(media)
    ? "pin"
    : "location_unknown";
}

export function resolveServiceRegionLabel(
  media: Pick<
    MediaItem,
    | "type"
    | "catalogSource"
    | "coverageDistrictCodes"
    | "networkRegionLabels"
  >,
): string | undefined {
  if (media.type === "mobile") {
    const codes = media.coverageDistrictCodes;
    if (!codes?.length) return undefined;
    const label = formatServiceRegionLabel(codes);
    return label || undefined;
  }
  if (isNetworkCatalogItem(media)) {
    const label = formatNetworkServiceRegionLabel(media.networkRegionLabels);
    return label || undefined;
  }
  return undefined;
}

export function mapItemShowsOnMap(mode: MapDisplayMode): boolean {
  return mode === "pin";
}

/** API/클라이언트 MapMapItem — mapDisplayMode 폴백 */
export function resolveItemMapDisplayMode(item: {
  mapDisplayMode?: MapDisplayMode;
  locationUnknown?: boolean;
  type?: string;
}): MapDisplayMode {
  if (item.mapDisplayMode) return item.mapDisplayMode;
  if (item.locationUnknown) return "location_unknown";
  if (item.type === "mobile") return "service_region";
  return "pin";
}

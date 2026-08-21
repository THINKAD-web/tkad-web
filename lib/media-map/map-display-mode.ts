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

export function isNationalBrowseRegion(
  media: Pick<MediaItem, "region" | "regionMain">,
): boolean {
  const main = media.regionMain?.trim().toLowerCase() ?? "";
  const region = media.region?.trim().toLowerCase() ?? "";
  return (
    main === "national" ||
    region === "national" ||
    region === "nationwide"
  );
}

export type MediaDetailMapNotice = {
  mode: Exclude<MapDisplayMode, "pin">;
  title: string;
  description: string;
};

/** 상세 — 핀을 찍지 않을 때 안내 카피 (`/media/map` service_region 과 동일 분류) */
export function resolveMediaDetailMapNotice(
  media: Pick<
    MediaItem,
    | "type"
    | "catalogSource"
    | "lat"
    | "lng"
    | "installLocations"
    | "coordinatesAreFallback"
    | "coverageDistrictCodes"
    | "networkRegionLabels"
    | "region"
    | "regionMain"
  >,
  isKo: boolean,
): MediaDetailMapNotice | null {
  const mode = resolveMapDisplayMode(media);
  if (mode === "pin") return null;

  if (mode === "location_unknown") {
    return {
      mode,
      title: isKo ? "위치 미확인" : "Location not set",
      description: isKo
        ? "좌표가 없어 지도에 핀을 표시하지 않습니다."
        : "This listing has no map coordinates, so no pin is shown.",
    };
  }

  const regionLabel = resolveServiceRegionLabel(media);
  const noPinHint = isKo
    ? media.type === "mobile"
      ? "이동형 매체는 고정 위치가 없어 지도에 핀을 표시하지 않습니다."
      : "고정 설치 좌표가 없어 지도에 핀을 표시하지 않습니다."
    : media.type === "mobile"
      ? "Mobile media has no fixed site, so no map pin is shown."
      : "This listing has no plottable site coordinates, so no map pin is shown.";

  if (regionLabel) {
    return {
      mode,
      title: isKo ? `서비스 지역: ${regionLabel}` : `Service area: ${regionLabel}`,
      description: noPinHint,
    };
  }

  if (isNationalBrowseRegion(media)) {
    return {
      mode,
      title: isKo ? "전국 서비스 매체" : "Nationwide service media",
      description: noPinHint,
    };
  }

  return {
    mode,
    title: isKo ? "서비스 지역 미등록" : "Service area not set",
    description: noPinHint,
  };
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

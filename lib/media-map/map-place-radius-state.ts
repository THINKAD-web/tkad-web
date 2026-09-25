import type { MapPlaceRadiusValue } from "@/components/media-map/map-place-radius-search";
import type { MediaMapUrlState } from "@/lib/media-map/url-state";
import {
  MAP_RADIUS_PRESETS_M,
  type MapRadiusPresetM,
} from "@/lib/media-map/map-radius-filter";

function normalizeRadiusM(n: number): MapRadiusPresetM {
  if (MAP_RADIUS_PRESETS_M.includes(n as MapRadiusPresetM)) {
    return n as MapRadiusPresetM;
  }
  if (n <= 500) return 500;
  if (n <= 1000) return 1000;
  return 3000;
}

export function mapPlaceRadiusFromUrl(
  init: MediaMapUrlState | null | undefined,
): MapPlaceRadiusValue | null {
  if (
    init?.centerLat == null ||
    init?.centerLng == null ||
    init?.radiusM == null
  ) {
    return null;
  }
  return {
    centerLat: init.centerLat,
    centerLng: init.centerLng,
    radiusM: normalizeRadiusM(init.radiusM),
    placeLabel: init.placeLabel?.trim() || "",
    searchType: "poi",
  };
}

export function mapPlaceRadiusToUrlState(
  value: MapPlaceRadiusValue | null,
): Pick<MediaMapUrlState, "centerLat" | "centerLng" | "radiusM" | "placeLabel"> {
  if (!value) return {};
  return {
    centerLat: value.centerLat,
    centerLng: value.centerLng,
    radiusM: value.radiusM,
    placeLabel: value.placeLabel || undefined,
  };
}

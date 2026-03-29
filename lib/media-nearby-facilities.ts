import {
  buildNearbyFacilitiesText,
  buildNearbyStationsAndLandmarks,
} from "@/lib/kakao-nearby-pois";

/** 이미 문구가 있거나 좌표가 없으면 그대로 null (스킵). */
export async function maybeBuildNearbyFacilitiesText(params: {
  existingNearby: string | null | undefined;
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  radiusM?: number;
}): Promise<string | null> {
  if (String(params.existingNearby ?? "").trim()) return null;
  const lat = params.latitude;
  const lng = params.longitude;
  if (lat == null || lng == null) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return buildNearbyFacilitiesText({
    latitude: lat,
    longitude: lng,
    radiusM: params.radiusM,
  });
}

/**
 * `nearbyFacilities` / `nearbyStations` / `nearbyLandmarks` 중 비어 있는 것만 카카오로 채움.
 * 하나라도 채워지면 `autoPopulatedAt` 포함.
 */
export async function maybeAutoFillNearbyMediaFields(params: {
  existingFacilities?: string | null | undefined;
  existingStations?: string | null | undefined;
  existingLandmarks?: string | null | undefined;
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  radiusM?: number;
}): Promise<{
  nearbyFacilities?: string | null;
  nearbyStations?: string | null;
  nearbyLandmarks?: string | null;
  autoPopulatedAt: Date;
} | null> {
  const needF = !String(params.existingFacilities ?? "").trim();
  const needS = !String(params.existingStations ?? "").trim();
  const needL = !String(params.existingLandmarks ?? "").trim();
  if (!needF && !needS && !needL) return null;

  const lat = params.latitude;
  const lng = params.longitude;
  if (lat == null || lng == null) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const split = await buildNearbyStationsAndLandmarks({
    latitude: lat,
    longitude: lng,
    radiusM: params.radiusM,
  });
  if (!split) return null;

  const out: {
    nearbyFacilities?: string | null;
    nearbyStations?: string | null;
    nearbyLandmarks?: string | null;
    autoPopulatedAt: Date;
  } = { autoPopulatedAt: new Date() };

  if (needF && split.combined) out.nearbyFacilities = split.combined;
  if (needS && split.stations) out.nearbyStations = split.stations;
  if (needL && split.landmarks) out.nearbyLandmarks = split.landmarks;

  if (
    out.nearbyFacilities === undefined &&
    out.nearbyStations === undefined &&
    out.nearbyLandmarks === undefined
  ) {
    return null;
  }
  return out;
}

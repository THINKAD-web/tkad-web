import type { MediaItem } from "@/lib/media-data";
import { haversineKm } from "@/lib/media-data";
import {
  resolveMapDisplayMode,
  type MapDisplayMode,
} from "@/lib/media-map/map-display-mode";

export const MAP_RADIUS_PRESETS_M = [500, 1000, 3000] as const;
export type MapRadiusPresetM = (typeof MAP_RADIUS_PRESETS_M)[number];

export function parseMapRadiusM(raw: string | null | undefined): number | null {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(20_000, Math.round(n));
}

export type MapRadiusCenter = {
  lat: number;
  lng: number;
};

function coordsForRadiusCheck(
  m: Pick<MediaItem, "lat" | "lng" | "installLocations">,
): { lat: number; lng: number }[] {
  const installs = m.installLocations ?? [];
  if (installs.length > 0) {
    return installs
      .filter(
        (p) =>
          Number.isFinite(p.lat) &&
          Number.isFinite(p.lng) &&
          Math.abs(p.lat) <= 90 &&
          Math.abs(p.lng) <= 180,
      )
      .map((p) => ({ lat: p.lat, lng: p.lng }));
  }
  if (
    Number.isFinite(m.lat) &&
    Number.isFinite(m.lng) &&
    Math.abs(m.lat) <= 90 &&
    Math.abs(m.lng) <= 180
  ) {
    return [{ lat: m.lat!, lng: m.lng! }];
  }
  return [];
}

/** 반경 검색 — 좌표 있는 pin 매체만. service_region·location_unknown 제외. */
export function mediaItemWithinRadiusM(
  m: MediaItem,
  center: MapRadiusCenter,
  radiusM: number,
): boolean {
  const mode: MapDisplayMode = resolveMapDisplayMode(m);
  if (mode === "service_region" || mode === "location_unknown") return false;
  const radiusKm = radiusM / 1000;
  const points = coordsForRadiusCheck(m);
  if (points.length === 0) return false;
  for (const p of points) {
    const dKm = haversineKm(
      { lat: center.lat, lng: center.lng },
      { lat: p.lat, lng: p.lng },
    );
    if (dKm * 1000 <= radiusM) return true;
  }
  return false;
}

/** Leaflet bounds — 원 전체가 보이도록 (대략적). */
export function boundsForRadiusCircle(
  center: MapRadiusCenter,
  radiusM: number,
): { swLat: number; swLng: number; neLat: number; neLng: number } {
  const lat = center.lat;
  const lng = center.lng;
  const dLat = radiusM / 111_320;
  const cos = Math.cos((lat * Math.PI) / 180);
  const dLng = radiusM / (111_320 * Math.max(0.2, cos));
  return {
    swLat: lat - dLat,
    swLng: lng - dLng,
    neLat: lat + dLat,
    neLng: lng + dLng,
  };
}

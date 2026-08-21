import { isKoreaMediaCountry } from "./media-country.ts";

export type DetailMapBounds = {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
};

export type DetailMapViewCommand =
  | { type: "fitMarkers"; auto?: boolean; nonce: number }
  | {
      type: "focusMarker";
      lat: number;
      lng: number;
      level: number;
      nonce: number;
      adjustLevel?: boolean;
    }
  | null;

/** 공개 매체 상세 — 해외는 Leaflet(Carto), 국내는 카카오 유지 */
export function mediaDetailUsesLeafletMap(
  country: string | null | undefined,
): boolean {
  return !isKoreaMediaCountry(country);
}

export type DetailMapProgrammaticView = {
  lat: number;
  lng: number;
  zoom: number;
  nonce: number;
  fitBounds?: DetailMapBounds;
  fitBoundsMaxZoom?: number;
};

export function markerLatLngBounds(
  markers: readonly { lat: number; lng: number }[],
): DetailMapBounds | null {
  if (markers.length === 0) return null;
  let swLat = Infinity;
  let swLng = Infinity;
  let neLat = -Infinity;
  let neLng = -Infinity;
  for (const m of markers) {
    if (!Number.isFinite(m.lat) || !Number.isFinite(m.lng)) continue;
    swLat = Math.min(swLat, m.lat);
    swLng = Math.min(swLng, m.lng);
    neLat = Math.max(neLat, m.lat);
    neLng = Math.max(neLng, m.lng);
  }
  if (!Number.isFinite(swLat)) return null;
  return { swLat, swLng, neLat, neLng };
}

/** Kakao `MapViewCommand` → `DarkMapView` programmaticView */
export function mapViewCommandToDarkProgrammaticView(
  command: DetailMapViewCommand,
  markers: readonly { lat: number; lng: number }[],
): DetailMapProgrammaticView | null {
  if (!command) return null;
  if (command.type === "focusMarker") {
    return {
      lat: command.lat,
      lng: command.lng,
      zoom: command.level,
      nonce: command.nonce,
    };
  }
  const b = markerLatLngBounds(markers);
  if (!b) return null;
  if (markers.length === 1) {
    const only = markers[0]!;
    return {
      lat: only.lat,
      lng: only.lng,
      zoom: 4,
      nonce: command.nonce,
    };
  }
  return {
    lat: (b.swLat + b.neLat) / 2,
    lng: (b.swLng + b.neLng) / 2,
    zoom: 8,
    nonce: command.nonce,
    fitBounds: b,
    fitBoundsMaxZoom: 16,
  };
}

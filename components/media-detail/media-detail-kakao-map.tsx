"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import type { MapBounds, MapMarker } from "@/components/public-map/map-types";
import type { MapViewCommand } from "@/components/media-map/kakao-map-view";
import {
  mapViewCommandToDarkProgrammaticView,
  markerLatLngBounds,
  mediaDetailUsesLeafletMap,
} from "@/lib/media-detail-map-engine";

const KakaoMapView = dynamic(
  () => import("@/components/media-map/kakao-map-view"),
  { ssr: false },
);

const DarkMapView = dynamic(
  () => import("@/components/public-map/dark-map-view"),
  { ssr: false },
);

type Props = {
  /** ISO country — 해외(≠KR)만 Leaflet. 생략 시 국내(카카오) */
  country?: string | null;
  markers: MapMarker[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onBoundsChange?: (b: MapBounds) => void;
  center: { lat: number; lng: number };
  zoom?: number;
  coverageGeoJson?: unknown | null;
  fitCoverageBounds?: boolean;
  disableCluster?: boolean;
  fitMarkersBounds?: boolean;
  zoomOnSelect?: number;
  command?: MapViewCommand;
};

function noopBounds(_b: MapBounds) {}

/**
 * 매체 상세 임베드 지도.
 * 해외: `/media/map` 과 같은 Leaflet+Carto (`DarkMapView`).
 * 국내: 기존 카카오 (`KakaoMapView`).
 */
export function MediaDetailKakaoMap({
  country,
  markers,
  selectedId = markers[0]?.id ?? null,
  onSelect = () => {},
  onBoundsChange = noopBounds,
  center,
  zoom = 4,
  coverageGeoJson = null,
  fitCoverageBounds = false,
  disableCluster = false,
  fitMarkersBounds = false,
  zoomOnSelect,
  command,
}: Props) {
  const useLeaflet = mediaDetailUsesLeafletMap(country);

  const leafletProgrammatic = useMemo(() => {
    const fromCmd = mapViewCommandToDarkProgrammaticView(command ?? null, markers);
    if (fromCmd) return fromCmd;
    if (!fitMarkersBounds || markers.length <= 1) return null;
    const b = markerLatLngBounds(markers);
    if (!b) return null;
    return {
      lat: center.lat,
      lng: center.lng,
      zoom,
      nonce: 1,
      fitBounds: b,
      fitBoundsMaxZoom: 16,
    };
  }, [command, markers, fitMarkersBounds, center.lat, center.lng, zoom]);

  if (useLeaflet) {
    return (
      <DarkMapView
        markers={markers}
        selectedId={selectedId}
        onSelect={onSelect}
        onBoundsChange={onBoundsChange}
        center={center}
        zoom={zoom}
        coverageGeoJson={coverageGeoJson}
        fitCoverageBounds={fitCoverageBounds}
        disableCluster={disableCluster}
        programmaticView={leafletProgrammatic}
        themeAwareTiles
      />
    );
  }

  return (
    <KakaoMapView
      markers={markers}
      selectedId={selectedId}
      onSelect={onSelect}
      onBoundsChange={onBoundsChange}
      center={center}
      zoom={zoom}
      coverageGeoJson={coverageGeoJson}
      fitCoverageBounds={fitCoverageBounds}
      disableCluster={disableCluster}
      fitMarkersBounds={fitMarkersBounds}
      zoomOnSelect={zoomOnSelect}
      command={command}
      monochromeTiles
    />
  );
}

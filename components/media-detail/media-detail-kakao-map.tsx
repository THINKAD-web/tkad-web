"use client";

import dynamic from "next/dynamic";
import type { MapBounds, MapMarker } from "@/components/public-map/map-types";

const KakaoMapView = dynamic(
  () => import("@/components/media-map/kakao-map-view"),
  { ssr: false },
);

type Props = {
  markers: MapMarker[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onBoundsChange?: (b: MapBounds) => void;
  center: { lat: number; lng: number };
  zoom?: number;
  coverageGeoJson?: unknown | null;
  fitCoverageBounds?: boolean;
  /** 소수 핀(상세·복수 설치) — 클러스터 합쳐짐 방지 */
  disableCluster?: boolean;
};

/** 매체 상세 — 단일/소수 핀 카카오 지도 (Leaflet 대신) */
export function MediaDetailKakaoMap({
  markers,
  selectedId = markers[0]?.id ?? null,
  onSelect = () => {},
  onBoundsChange = () => {},
  center,
  zoom = 4,
  coverageGeoJson = null,
  fitCoverageBounds = false,
  disableCluster = false,
}: Props) {
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
      monochromeTiles
    />
  );
}

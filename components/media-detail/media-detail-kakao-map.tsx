"use client";

import dynamic from "next/dynamic";
import type { MapBounds, MapMarker } from "@/components/public-map/map-types";
import type { MapViewCommand } from "@/components/media-map/kakao-map-view";

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
  /** 네트워크 다지점 — 모든 핀이 한 화면에 들어오도록 bounds 맞춤 */
  fitMarkersBounds?: boolean;
  /** 선택 시 클로즈업 줌 (카카오 레벨, 작을수록 확대) */
  zoomOnSelect?: number;
  /** 단일 명령형 뷰 채널 (넘기면 레거시 fit/panTo effect 비활성) */
  command?: MapViewCommand;
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
  fitMarkersBounds = false,
  zoomOnSelect,
  command,
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
      fitMarkersBounds={fitMarkersBounds}
      zoomOnSelect={zoomOnSelect}
      command={command}
      monochromeTiles
    />
  );
}

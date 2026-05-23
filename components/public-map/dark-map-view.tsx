"use client";

import { useCallback, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import {
  MapContainer,
  TileLayer,
  useMap,
  GeoJSON,
  CircleMarker,
} from "react-leaflet";
import { cn } from "@/lib/utils";
import {
  PUBLIC_DARK_MAP_DEFAULT_CENTER,
  PUBLIC_DARK_MAP_TILE_SUBDOMAINS,
  PUBLIC_DARK_MAP_TILE_URL,
  kakaoLevelToLeafletZoom,
  leafletZoomToKakaoLevel,
} from "@/lib/public-dark-map-config";
import type { MapBounds, MapMarker } from "@/components/public-map/map-types";
import { DarkMapMarkersLayer } from "@/components/public-map/dark-map-markers-layer";

export type { MapBounds, MapMarker };

type Props = {
  markers: MapMarker[];
  selectedId: string | null;
  hoveredId?: string | null;
  onSelect: (id: string) => void;
  onBoundsChange: (b: MapBounds) => void;
  onViewChange?: (view: { lat: number; lng: number; zoom: number }) => void;
  center?: { lat: number; lng: number };
  /** Kakao level 호환 — 내부에서 Leaflet zoom 으로 변환 */
  zoom?: number;
  programmaticView?: {
    lat: number;
    lng: number;
    zoom: number;
    nonce: number;
  } | null;
  userLocation?: { lat: number; lng: number } | null;
  coverageGeoJson?: unknown | null;
  fitCoverageBounds?: boolean;
  monochromeTiles?: boolean;
  className?: string;
  disableCluster?: boolean;
};

function MapResizeFix() {
  const map = useMap();
  useEffect(() => {
    const raf = window.requestAnimationFrame(() => map.invalidateSize());
    const t = window.setTimeout(() => map.invalidateSize(), 150);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(t);
    };
  }, [map]);
  return null;
}

function BoundsReporter({
  onBoundsChange,
  onViewChange,
}: {
  onBoundsChange: (b: MapBounds) => void;
  onViewChange?: (view: { lat: number; lng: number; zoom: number }) => void;
}) {
  const map = useMap();
  const onBoundsRef = useRef(onBoundsChange);
  const onViewRef = useRef(onViewChange);
  onBoundsRef.current = onBoundsChange;
  onViewRef.current = onViewChange;

  useEffect(() => {
    const fire = () => {
      const b = map.getBounds();
      onBoundsRef.current({
        swLat: b.getSouth(),
        swLng: b.getWest(),
        neLat: b.getNorth(),
        neLng: b.getEast(),
      });
      const c = map.getCenter();
      onViewRef.current?.({
        lat: c.lat,
        lng: c.lng,
        zoom: leafletZoomToKakaoLevel(map.getZoom()),
      });
    };
    map.on("moveend", fire);
    fire();
    return () => {
      map.off("moveend", fire);
    };
  }, [map]);

  return null;
}

function ProgrammaticView({
  view,
}: {
  view: Props["programmaticView"];
}) {
  const map = useMap();
  const lastNonce = useRef<number | null>(null);

  useEffect(() => {
    if (!view || view.nonce === lastNonce.current) return;
    lastNonce.current = view.nonce;
    map.setView(
      [view.lat, view.lng],
      kakaoLevelToLeafletZoom(view.zoom, map.getZoom()),
      { animate: true },
    );
  }, [map, view]);

  return null;
}

function CoverageLayer({
  geoJson,
  fitBounds,
}: {
  geoJson: unknown;
  fitBounds?: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (!fitBounds || !geoJson) return;
    try {
      const layer = L.geoJSON(geoJson as GeoJSON.GeoJsonObject);
      const b = layer.getBounds();
      if (b.isValid()) map.fitBounds(b, { padding: [24, 24] });
    } catch {
      /* ignore */
    }
  }, [geoJson, fitBounds, map]);

  if (!geoJson) return null;

  return (
    <GeoJSON
      data={geoJson as GeoJSON.GeoJsonObject}
      style={{
        color: "#22d3ee",
        weight: 2,
        opacity: 0.85,
        fillColor: "#22d3ee",
        fillOpacity: 0.12,
      }}
    />
  );
}

export default function DarkMapView({
  markers,
  selectedId,
  hoveredId = null,
  onSelect,
  onBoundsChange,
  onViewChange,
  center = PUBLIC_DARK_MAP_DEFAULT_CENTER,
  zoom = 8,
  programmaticView = null,
  userLocation = null,
  coverageGeoJson = null,
  fitCoverageBounds = false,
  className,
  disableCluster = false,
}: Props) {
  const leafletZoom = kakaoLevelToLeafletZoom(zoom, 10);
  const onSelectStable = useCallback((id: string) => onSelect(id), [onSelect]);
  const useCluster = !disableCluster && markers.length > 1;

  return (
    <div
      className={cn(
        "tkad-dark-map-root relative h-full w-full min-h-[200px]",
        className,
      )}
    >
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={leafletZoom}
        minZoom={5}
        maxZoom={18}
        style={{ height: "100%", width: "100%" }}
        className="z-0 h-full w-full"
        scrollWheelZoom
        zoomControl
      >
        <TileLayer
          url={PUBLIC_DARK_MAP_TILE_URL}
          subdomains={PUBLIC_DARK_MAP_TILE_SUBDOMAINS}
          maxZoom={20}
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        <MapResizeFix />
        <BoundsReporter
          onBoundsChange={onBoundsChange}
          onViewChange={onViewChange}
        />
        <ProgrammaticView view={programmaticView} />
        <CoverageLayer geoJson={coverageGeoJson} fitBounds={fitCoverageBounds} />
        <DarkMapMarkersLayer
          markers={markers}
          selectedId={selectedId}
          hoveredId={hoveredId}
          onSelect={onSelectStable}
          disableCluster={!useCluster}
        />
        {userLocation ? (
          <CircleMarker
            center={[userLocation.lat, userLocation.lng]}
            radius={8}
            pathOptions={{
              color: "#22d3ee",
              fillColor: "#22d3ee",
              weight: 2,
              fillOpacity: 0.9,
            }}
          />
        ) : null}
      </MapContainer>
    </div>
  );
}

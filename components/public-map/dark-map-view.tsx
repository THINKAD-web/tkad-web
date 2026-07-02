"use client";

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import { useTheme } from "next-themes";
import {
  MapContainer,
  useMap,
  GeoJSON,
  CircleMarker,
  ZoomControl,
} from "react-leaflet";
import { cn } from "@/lib/utils";
import {
  PUBLIC_DARK_MAP_DEFAULT_CENTER,
  isPublicMapLightTile,
  kakaoLevelToLeafletZoom,
  leafletZoomToKakaoLevel,
} from "@/lib/public-dark-map-config";
import type { MapBounds, MapMarker } from "@/components/public-map/map-types";
import { DarkMapMarkersLayer } from "@/components/public-map/dark-map-markers-layer";
import {
  DarkMapTileLayer,
  resolveDarkMapLightTiles,
} from "@/components/public-map/dark-map-tile-layer";
import { SeoulMetroOverlayLayer } from "@/components/public-map/seoul-metro-overlay-layer";

export type { MapBounds, MapMarker };

/** Kakao level 호환 programmatic 이동 — nonce 로 중복 setView 방지 */
export type DarkMapProgrammaticView = {
  lat: number;
  lng: number;
  /** Kakao level (작을수록 확대) */
  zoom: number;
  nonce: number;
  /** true면 현재 Leaflet zoom 보다 확대할 때만 적용 (줌아웃 금지) */
  zoomInOnly?: boolean;
  /** Leaflet zoom 상한 — 단일/소영역 과확대 방지 */
  maxZoom?: number;
  /** 설정 시 setView 대신 fitBounds (검색 결과 영역 맞춤) */
  fitBounds?: MapBounds;
  /** fitBounds 시 Leaflet maxZoom (기본 12) */
  fitBoundsMaxZoom?: number;
};

type Props = {
  markers: MapMarker[];
  selectedId: string | null;
  hoveredId?: string | null;
  onSelect: (id: string) => void;
  onBoundsChange: (b: MapBounds) => void;
  onViewChange?: (view: { lat: number; lng: number; zoom: number }) => void;
  /** 사용자 드래그/줌 시작 시 1회 — 프로그램matic setView 직후에는 호출 안 함 */
  onUserViewportAdjusted?: () => void;
  center?: { lat: number; lng: number };
  /** Kakao level 호환 — 내부에서 Leaflet zoom 으로 변환 */
  zoom?: number;
  programmaticView?: DarkMapProgrammaticView | null;
  userLocation?: { lat: number; lng: number } | null;
  coverageGeoJson?: unknown | null;
  fitCoverageBounds?: boolean;
  /** fitCoverageBounds 시 Leaflet maxZoom (기본 15) */
  fitBoundsMaxZoom?: number;
  monochromeTiles?: boolean;
  className?: string;
  disableCluster?: boolean;
  /** 값이 바뀔 때마다 map.invalidateSize() 1회 호출 — 레이아웃 전환/바텀시트 스냅 변경 후 타일 재계산 */
  invalidateNonce?: number;
  /** next-themes light/dark 에 맞춰 Carto Voyager / Dark Matter(라벨 포함) 전환 */
  themeAwareTiles?: boolean;
  /** 보고서 등 라이트 문서 — Carto light 타일 고정 (다크 타일 금지) */
  preferLightTiles?: boolean;
  /** 수도권 지하철 GeoJSON 오버레이 — `/media/map` 전용 */
  subwayOverlayEnabled?: boolean;
};

/** 외부 nonce 변경 시 invalidateSize() — 컨테이너 크기 변화가 없는 레이아웃/스냅 전환에도 타일 보정 */
function InvalidateOnNonce({ nonce }: { nonce?: number }) {
  const map = useMap();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const raf = window.requestAnimationFrame(() => {
      try {
        map.invalidateSize({ animate: false });
      } catch {
        /* noop */
      }
    });
    return () => window.cancelAnimationFrame(raf);
  }, [map, nonce]);
  return null;
}

function prefersReducedMapMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function mapMotionDurationSec(): number {
  return prefersReducedMapMotion() ? 0 : 0.72;
}

/** 타일 로딩 상태 — 루트 오버레이와 연동 */
function MapTileLoadingTracker({
  onLoadingChange,
}: {
  onLoadingChange: (loading: boolean) => void;
}) {
  const map = useMap();

  useEffect(() => {
    const onLoadStart = () => onLoadingChange(true);
    const onLoadEnd = () => onLoadingChange(false);
    map.on("loading", onLoadStart);
    map.on("load", onLoadEnd);
    map.on("tileload", onLoadEnd);
    const t = window.setTimeout(() => onLoadingChange(false), 2400);
    return () => {
      map.off("loading", onLoadStart);
      map.off("load", onLoadEnd);
      map.off("tileload", onLoadEnd);
      window.clearTimeout(t);
    };
  }, [map, onLoadingChange]);

  return null;
}

function MapResizeFix() {
  const map = useMap();
  useEffect(() => {
    let rafId = 0;
    let debounceTimer: ReturnType<typeof window.setTimeout> | undefined;
    let stabilityTimer: ReturnType<typeof window.setTimeout> | undefined;

    const invalidate = () => {
      try {
        map.invalidateSize({ animate: false });
      } catch {
        /* noop */
      }
    };

    const scheduleInvalidate = (delayMs = 100) => {
      if (debounceTimer !== undefined) window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        debounceTimer = undefined;
        window.cancelAnimationFrame(rafId);
        rafId = window.requestAnimationFrame(invalidate);
      }, delayMs);
    };

    rafId = window.requestAnimationFrame(invalidate);
    stabilityTimer = window.setTimeout(invalidate, 400);

    const container = map.getContainer();
    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => scheduleInvalidate(180))
        : null;
    resizeObserver?.observe(container);

    const onWindowResize = () => scheduleInvalidate(80);
    window.addEventListener("resize", onWindowResize);
    return () => {
      window.cancelAnimationFrame(rafId);
      if (debounceTimer !== undefined) window.clearTimeout(debounceTimer);
      if (stabilityTimer !== undefined) window.clearTimeout(stabilityTimer);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", onWindowResize);
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

function UserViewportListener({
  onUserViewportAdjusted,
  programmaticApplyRef,
}: {
  onUserViewportAdjusted?: () => void;
  programmaticApplyRef: MutableRefObject<boolean>;
}) {
  const map = useMap();
  const onAdjustRef = useRef(onUserViewportAdjusted);
  onAdjustRef.current = onUserViewportAdjusted;

  useEffect(() => {
    const fire = () => {
      if (programmaticApplyRef.current) return;
      onAdjustRef.current?.();
    };
    map.on("dragstart", fire);
    map.on("zoomstart", fire);
    return () => {
      map.off("dragstart", fire);
      map.off("zoomstart", fire);
    };
  }, [map, programmaticApplyRef]);

  return null;
}

function ProgrammaticView({
  view,
  programmaticApplyRef,
}: {
  view: Props["programmaticView"];
  programmaticApplyRef: MutableRefObject<boolean>;
}) {
  const map = useMap();
  const lastNonce = useRef<number | null>(null);

  useEffect(() => {
    if (!view || view.nonce === lastNonce.current) return;
    lastNonce.current = view.nonce;
    programmaticApplyRef.current = true;

    const duration = mapMotionDurationSec();

    if (view.fitBounds) {
      const b = L.latLngBounds(
        [view.fitBounds.swLat, view.fitBounds.swLng],
        [view.fitBounds.neLat, view.fitBounds.neLng],
      );
      if (b.isValid()) {
        if (duration <= 0) {
          map.fitBounds(b, {
            padding: [32, 32],
            maxZoom: view.fitBoundsMaxZoom ?? 12,
            animate: false,
          });
        } else {
          map.flyToBounds(b, {
            padding: [32, 32],
            maxZoom: view.fitBoundsMaxZoom ?? 12,
            duration,
            easeLinearity: 0.22,
          });
        }
      }
    } else {
      const targetLeaflet = kakaoLevelToLeafletZoom(view.zoom, map.getZoom());
      let leafletZoom = view.zoomInOnly
        ? Math.max(map.getZoom(), targetLeaflet)
        : targetLeaflet;
      if (view.maxZoom != null) {
        leafletZoom = Math.min(leafletZoom, view.maxZoom);
      }
      if (duration <= 0) {
        map.setView([view.lat, view.lng], leafletZoom, { animate: false });
      } else {
        map.flyTo([view.lat, view.lng], leafletZoom, {
          duration,
          easeLinearity: 0.22,
        });
      }
    }

    const t = window.setTimeout(() => {
      programmaticApplyRef.current = false;
    }, Math.max(0, duration * 1000));
    return () => window.clearTimeout(t);
  }, [map, view, programmaticApplyRef]);

  return null;
}

function CoverageLayer({
  geoJson,
  fitBounds,
  fitBoundsMaxZoom = 15,
}: {
  geoJson: unknown;
  fitBounds?: boolean;
  fitBoundsMaxZoom?: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!fitBounds || !geoJson) return;
    try {
      const layer = L.geoJSON(geoJson as GeoJSON.GeoJsonObject);
      const b = layer.getBounds();
      if (b.isValid()) {
        map.fitBounds(b, { padding: [24, 24], maxZoom: fitBoundsMaxZoom });
      }
    } catch {
      /* ignore */
    }
  }, [geoJson, fitBounds, fitBoundsMaxZoom, map]);

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
  fitBoundsMaxZoom = 15,
  className,
  disableCluster = false,
  onUserViewportAdjusted,
  invalidateNonce,
  themeAwareTiles = false,
  preferLightTiles = false,
  subwayOverlayEnabled = false,
}: Props) {
  const { resolvedTheme } = useTheme();
  const [tilesLoading, setTilesLoading] = useState(true);
  const onTilesLoadingChange = useCallback((loading: boolean) => {
    setTilesLoading(loading);
  }, []);

  const leafletZoom = kakaoLevelToLeafletZoom(zoom, 10);
  const onSelectStable = useCallback((id: string) => onSelect(id), [onSelect]);
  const useCluster = !disableCluster && markers.length > 1;
  const programmaticApplyRef = useRef(false);
  const lightTiles = preferLightTiles
    ? true
    : themeAwareTiles
      ? resolveDarkMapLightTiles(true, resolvedTheme)
      : isPublicMapLightTile();

  return (
    <div
      className={cn(
        "tkad-dark-map-root relative h-full w-full min-h-[200px] touch-none",
        className,
      )}
    >
      {tilesLoading ? (
        <div
          className="pointer-events-none absolute inset-0 z-[5] skeleton-shimmer bg-muted/50"
          aria-hidden
        />
      ) : null}
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={leafletZoom}
        minZoom={5}
        maxZoom={18}
        style={{ height: "100%", width: "100%" }}
        className="z-0 h-full w-full touch-none"
        scrollWheelZoom
        touchZoom
        doubleClickZoom
        dragging
        zoomControl={false}
        zoomAnimation
      >
        <DarkMapTileLayer themeAware={themeAwareTiles} preferLight={preferLightTiles} />
        {subwayOverlayEnabled ? (
          <SeoulMetroOverlayLayer lightTiles={lightTiles} />
        ) : null}
        <ZoomControl position="bottomright" />
        <MapResizeFix />
        <InvalidateOnNonce nonce={invalidateNonce} />
        <MapTileLoadingTracker onLoadingChange={onTilesLoadingChange} />
        <BoundsReporter
          onBoundsChange={onBoundsChange}
          onViewChange={onViewChange}
        />
        <UserViewportListener
          onUserViewportAdjusted={onUserViewportAdjusted}
          programmaticApplyRef={programmaticApplyRef}
        />
        <ProgrammaticView
          view={programmaticView}
          programmaticApplyRef={programmaticApplyRef}
        />
        <CoverageLayer
          geoJson={coverageGeoJson}
          fitBounds={fitCoverageBounds}
          fitBoundsMaxZoom={fitBoundsMaxZoom}
        />
        <DarkMapMarkersLayer
          markers={markers}
          selectedId={selectedId}
          hoveredId={hoveredId}
          onSelect={onSelectStable}
          disableCluster={!useCluster}
          lightTiles={lightTiles}
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

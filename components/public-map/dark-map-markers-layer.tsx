"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";
import { leafletPinIcon, pinZIndexOffset } from "@/lib/map-pin-styles";
import {
  affectedPinIdsForActiveStateChange,
  mapPinMatchesActiveId,
  pinsMatchingActiveId,
  type MapPinActiveSets,
} from "@/lib/media-detail-map-markers";
import type { MapMarker } from "@/components/public-map/map-types";

function clusterSizeClass(count: number): string {
  if (count >= 90) return "large";
  if (count >= 35) return "medium";
  return "small";
}

function buildClusterIcon(count: number, lightTiles: boolean): L.DivIcon {
  const sizeClass = clusterSizeClass(count);
  const px = sizeClass === "large" ? 44 : sizeClass === "medium" ? 40 : 36;
  const bg = lightTiles
    ? "linear-gradient(145deg, rgba(255,255,255,0.96), rgba(241,245,249,0.92))"
    : "linear-gradient(145deg, rgba(39,39,42,0.96), rgba(24,24,27,0.94))";
  const border = lightTiles
    ? "2px solid rgba(15,23,42,0.18)"
    : "2px solid rgba(255,255,255,0.14)";
  const shadow = lightTiles
    ? `0 4px 14px rgba(15,23,42,0.18), inset 0 0 0 2px rgba(255,102,0,0.32)`
    : `0 4px 16px rgba(0,0,0,0.45), inset 0 0 0 2px rgba(255,102,0,0.28)`;
  const textColor = lightTiles ? "#0f172a" : "#f4f4f5";
  return L.divIcon({
    html: `<div style="width:${px}px;height:${px}px;border-radius:999px;border:${border};box-shadow:${shadow};background:${bg};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:${textColor};font-family:ui-monospace,monospace">${count}</div>`,
    className: `tkad-map-cluster tkad-map-cluster--${sizeClass}`,
    iconSize: L.point(px, px),
  });
}

function applyMarkerPinIcon(
  marker: L.Marker,
  pinId: string,
  meta: { type: string; visibilityScore?: number },
  selectedId: string | null,
  hoveredId: string | null,
  lightTiles: boolean,
) {
  const selected = mapPinMatchesActiveId(pinId, selectedId);
  const hovered = mapPinMatchesActiveId(pinId, hoveredId);
  marker.setIcon(
    leafletPinIcon(
      meta.type,
      selected,
      hovered,
      lightTiles,
      meta.visibilityScore,
    ),
  );
  marker.setZIndexOffset(pinZIndexOffset(selected, hovered));
}

export function DarkMapMarkersLayer({
  markers,
  selectedId,
  hoveredId,
  onSelect,
  disableCluster,
  lightTiles = false,
}: {
  markers: MapMarker[];
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string) => void;
  disableCluster?: boolean;
  lightTiles?: boolean;
}) {
  const map = useMap();
  const layerRef = useRef<L.LayerGroup | L.MarkerClusterGroup | null>(null);
  const markerRefs = useRef<Map<string, L.Marker>>(new Map());
  const markerMetaRef = useRef<Map<string, { type: string; visibilityScore?: number }>>(
    new Map(),
  );
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const lightTilesRef = useRef(lightTiles);
  lightTilesRef.current = lightTiles;
  const selectedIdRef = useRef(selectedId);
  const hoveredIdRef = useRef(hoveredId);
  selectedIdRef.current = selectedId;
  hoveredIdRef.current = hoveredId;
  const prevActivePinsRef = useRef<MapPinActiveSets>({
    selected: new Set(),
    hovered: new Set(),
  });

  useEffect(() => {
    const layer = disableCluster
      ? L.layerGroup()
      : L.markerClusterGroup({
          maxClusterRadius: 56,
          spiderfyOnMaxZoom: true,
          showCoverageOnHover: false,
          zoomToBoundsOnClick: true,
          animate: true,
          animateAddingMarkers: true,
          iconCreateFunction: (cluster) =>
            buildClusterIcon(cluster.getChildCount(), lightTilesRef.current),
        });
    layerRef.current = layer;
    map.addLayer(layer);
    return () => {
      map.removeLayer(layer);
      layerRef.current = null;
      markerRefs.current.clear();
      markerMetaRef.current.clear();
      prevActivePinsRef.current = { selected: new Set(), hovered: new Set() };
    };
  }, [map, disableCluster]);

  // markers / lightTiles 변경 시에만 증분 동기화 (clearLayers 금지)
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;

    const nextIds = new Set<string>();
    for (const mk of markers) {
      if (!Number.isFinite(mk.lat) || !Number.isFinite(mk.lng)) continue;
      nextIds.add(mk.id);
    }

    for (const [id, marker] of markerRefs.current.entries()) {
      if (nextIds.has(id)) continue;
      layer.removeLayer(marker);
      markerRefs.current.delete(id);
      markerMetaRef.current.delete(id);
    }

    const selected = selectedIdRef.current;
    const hovered = hoveredIdRef.current;
    const tiles = lightTilesRef.current;

    for (const mk of markers) {
      if (!Number.isFinite(mk.lat) || !Number.isFinite(mk.lng)) continue;
      markerMetaRef.current.set(mk.id, {
        type: mk.type,
        visibilityScore: mk.visibilityScore,
      });
      const existing = markerRefs.current.get(mk.id);
      if (existing) {
        existing.setLatLng([mk.lat, mk.lng]);
        const el = existing.getElement();
        if (el) el.title = mk.name;
        applyMarkerPinIcon(
          existing,
          mk.id,
          { type: mk.type, visibilityScore: mk.visibilityScore },
          selected,
          hovered,
          tiles,
        );
        continue;
      }
      const marker = L.marker([mk.lat, mk.lng], {
        icon: leafletPinIcon(
          mk.type,
          mapPinMatchesActiveId(mk.id, selected),
          mapPinMatchesActiveId(mk.id, hovered),
          tiles,
          mk.visibilityScore,
        ),
        title: mk.name,
        zIndexOffset: pinZIndexOffset(
          mapPinMatchesActiveId(mk.id, selected),
          mapPinMatchesActiveId(mk.id, hovered),
        ),
      });
      marker.on("click", () => onSelectRef.current(mk.id));
      layer.addLayer(marker);
      markerRefs.current.set(mk.id, marker);
    }

    const pinIds = [...markerRefs.current.keys()];
    prevActivePinsRef.current = {
      selected: pinsMatchingActiveId(pinIds, selected),
      hovered: pinsMatchingActiveId(pinIds, hovered),
    };
  }, [markers, lightTiles]);

  // selectedId / hoveredId — 영향받는 핀만 setIcon
  useEffect(() => {
    const pinIds = [...markerRefs.current.keys()];
    const { affected, next } = affectedPinIdsForActiveStateChange(
      pinIds,
      prevActivePinsRef.current,
      selectedId,
      hoveredId,
    );
    const tiles = lightTilesRef.current;
    for (const id of affected) {
      const marker = markerRefs.current.get(id);
      const meta = markerMetaRef.current.get(id);
      if (!marker || !meta) continue;
      applyMarkerPinIcon(marker, id, meta, selectedId, hoveredId, tiles);
    }
    prevActivePinsRef.current = next;
  }, [selectedId, hoveredId]);

  return null;
}

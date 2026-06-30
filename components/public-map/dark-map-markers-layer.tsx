"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";
import { leafletPinIcon } from "@/lib/map-pin-styles";
import {
  affectedPinIdsForActiveStateChange,
  mapPinMatchesActiveId,
  pinsMatchingActiveId,
  type MapPinActiveSets,
} from "@/lib/media-detail-map-markers";
import type { MapMarker } from "@/components/public-map/map-types";

const LAYER_GROUP_ADD_CHUNK = 80;

function clusterSizeClass(count: number): string {
  if (count >= 90) return "large";
  if (count >= 35) return "medium";
  return "small";
}

const clusterIconCache = new Map<string, L.DivIcon>();

function buildClusterIcon(count: number, lightTiles: boolean): L.DivIcon {
  const cacheKey = `${count}|${lightTiles ? 1 : 0}`;
  const cached = clusterIconCache.get(cacheKey);
  if (cached) return cached;

  const sizeClass = clusterSizeClass(count);
  const px = sizeClass === "large" ? 42 : sizeClass === "medium" ? 38 : 34;
  const border = lightTiles ? "2px solid rgba(15,23,42,0.5)" : "2px solid rgba(255,255,255,0.85)";
  const fill = lightTiles ? "#f97316" : "#fb923c";
  const textColor = lightTiles ? "#ffffff" : "#0f172a";
  const icon = L.divIcon({
    html: `<div style="width:${px}px;height:${px}px;border-radius:999px;border:${border};background:${fill};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:${textColor};font-family:ui-sans-serif,system-ui,sans-serif">${count}</div>`,
    className: `tkad-map-cluster tkad-map-cluster--${sizeClass}`,
    iconSize: L.point(px, px),
  });
  clusterIconCache.set(cacheKey, icon);
  return icon;
}

function applyMarkerPinIcon(
  marker: L.Marker,
  pinId: string,
  meta: { type: string; visibilityScore?: number },
  selectedId: string | null,
  hoveredId: string | null,
  lightTiles: boolean,
) {
  marker.setIcon(
    leafletPinIcon(
      meta.type,
      mapPinMatchesActiveId(pinId, selectedId),
      mapPinMatchesActiveId(pinId, hoveredId),
      lightTiles,
      meta.visibilityScore,
    ),
  );
}

function isMarkerClusterGroup(
  layer: L.LayerGroup | L.MarkerClusterGroup,
): layer is L.MarkerClusterGroup {
  return typeof (layer as L.MarkerClusterGroup).addLayers === "function";
}

function addMarkersInChunks(
  layer: L.LayerGroup,
  markersToAdd: L.Marker[],
  onDone: () => void,
  isCancelled: () => boolean,
) {
  if (markersToAdd.length === 0) {
    onDone();
    return;
  }

  let index = 0;
  const step = () => {
    if (isCancelled()) return;
    const end = Math.min(index + LAYER_GROUP_ADD_CHUNK, markersToAdd.length);
    for (; index < end; index += 1) {
      layer.addLayer(markersToAdd[index]!);
    }
    if (index < markersToAdd.length) {
      if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(step, { timeout: 120 });
      } else {
        window.requestAnimationFrame(step);
      }
      return;
    }
    onDone();
  };
  step();
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
  const syncGenerationRef = useRef(0);
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
          chunkedLoading: true,
          chunkInterval: 200,
          chunkDelay: 50,
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

    const generation = ++syncGenerationRef.current;
    const isCancelled = () => generation !== syncGenerationRef.current;

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
    const markersToAdd: L.Marker[] = [];

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
      });
      marker.on("click", () => onSelectRef.current(mk.id));
      markerRefs.current.set(mk.id, marker);
      markersToAdd.push(marker);
    }

    const finalizeActivePins = () => {
      if (isCancelled()) return;
      const pinIds = [...markerRefs.current.keys()];
      prevActivePinsRef.current = {
        selected: pinsMatchingActiveId(pinIds, selected),
        hovered: pinsMatchingActiveId(pinIds, hovered),
      };
    };

    if (markersToAdd.length === 0) {
      finalizeActivePins();
      return;
    }

    if (isMarkerClusterGroup(layer)) {
      layer.addLayers(markersToAdd);
      finalizeActivePins();
      return () => {
        syncGenerationRef.current += 1;
      };
    }

    addMarkersInChunks(layer, markersToAdd, finalizeActivePins, isCancelled);
    return () => {
      syncGenerationRef.current += 1;
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

"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";
import { leafletPinIcon } from "@/lib/map-pin-styles";
import { mapPinMatchesActiveId } from "@/lib/media-detail-map-markers";
import type { MapMarker } from "@/components/public-map/map-types";

function clusterSizeClass(count: number): string {
  if (count >= 90) return "large";
  if (count >= 35) return "medium";
  return "small";
}

function buildClusterIcon(count: number, lightTiles: boolean): L.DivIcon {
  const sizeClass = clusterSizeClass(count);
  const px = sizeClass === "large" ? 46 : sizeClass === "medium" ? 42 : 38;
  const border = lightTiles ? "2px solid rgba(15,23,42,0.45)" : "2px solid rgba(255,255,255,0.35)";
  const shadow = lightTiles
    ? "0 2px 8px rgba(15,23,42,0.28)"
    : "0 0 14px rgba(0,0,0,0.45)";
  const textColor = lightTiles ? "#0f172a" : "#f8fafc";
  return L.divIcon({
    html: `<div style="width:${px}px;height:${px}px;border-radius:999px;border:${border};box-shadow:${shadow};background:linear-gradient(145deg,#fbbf24,#f97316);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:${textColor};font-family:ui-monospace,monospace">${count}</div>`,
    className: `tkad-map-cluster tkad-map-cluster--${sizeClass}`,
    iconSize: L.point(px, px),
  });
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
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const lightTilesRef = useRef(lightTiles);
  lightTilesRef.current = lightTiles;

  useEffect(() => {
    const layer = disableCluster
      ? L.layerGroup()
      : L.markerClusterGroup({
          maxClusterRadius: 56,
          spiderfyOnMaxZoom: true,
          showCoverageOnHover: false,
          zoomToBoundsOnClick: true,
          iconCreateFunction: (cluster) =>
            buildClusterIcon(cluster.getChildCount(), lightTilesRef.current),
        });
    layerRef.current = layer;
    map.addLayer(layer);
    return () => {
      map.removeLayer(layer);
      layerRef.current = null;
      markerRefs.current.clear();
    };
  }, [map, disableCluster]);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();
    markerRefs.current.clear();

    for (const mk of markers) {
      if (!Number.isFinite(mk.lat) || !Number.isFinite(mk.lng)) continue;
      const isSelected = mapPinMatchesActiveId(mk.id, selectedId);
      const isHovered = mapPinMatchesActiveId(mk.id, hoveredId);
      const marker = L.marker([mk.lat, mk.lng], {
        icon: leafletPinIcon(mk.type, isSelected, isHovered, lightTiles),
        title: mk.name,
      });
      marker.on("click", () => onSelectRef.current(mk.id));
      layer.addLayer(marker);
      markerRefs.current.set(mk.id, marker);
    }
  }, [markers, selectedId, hoveredId, lightTiles]);

  useEffect(() => {
    for (const [id, marker] of markerRefs.current) {
      const mk = markers.find((m) => m.id === id);
      if (!mk) continue;
      marker.setIcon(
        leafletPinIcon(
          mk.type,
          mapPinMatchesActiveId(id, selectedId),
          mapPinMatchesActiveId(id, hoveredId),
          lightTiles,
        ),
      );
    }
  }, [selectedId, hoveredId, markers, lightTiles]);

  return null;
}

"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";
import { leafletPinIcon } from "@/lib/map-pin-styles";
import type { MapMarker } from "@/components/public-map/map-types";

export function DarkMapMarkersLayer({
  markers,
  selectedId,
  hoveredId,
  onSelect,
  disableCluster,
}: {
  markers: MapMarker[];
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string) => void;
  disableCluster?: boolean;
}) {
  const map = useMap();
  const layerRef = useRef<L.LayerGroup | L.MarkerClusterGroup | null>(null);
  const markerRefs = useRef<Map<string, L.Marker>>(new Map());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    const layer = disableCluster
      ? L.layerGroup()
      : L.markerClusterGroup({
          maxClusterRadius: 56,
          spiderfyOnMaxZoom: true,
          showCoverageOnHover: false,
          zoomToBoundsOnClick: true,
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
      const isSelected = mk.id === selectedId;
      const isHovered = mk.id === hoveredId;
      const marker = L.marker([mk.lat, mk.lng], {
        icon: leafletPinIcon(mk.type, isSelected, isHovered),
        title: mk.name,
      });
      marker.on("click", () => onSelectRef.current(mk.id));
      layer.addLayer(marker);
      markerRefs.current.set(mk.id, marker);
    }
  }, [markers, selectedId, hoveredId]);

  useEffect(() => {
    for (const [id, marker] of markerRefs.current) {
      const mk = markers.find((m) => m.id === id);
      if (!mk) continue;
      marker.setIcon(
        leafletPinIcon(
          mk.type,
          id === selectedId,
          id === hoveredId,
        ),
      );
    }
  }, [selectedId, hoveredId, markers]);

  return null;
}

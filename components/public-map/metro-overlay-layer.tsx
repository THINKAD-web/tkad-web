"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";
import { chunkIntersectsViewport, mapBoundsToMetroBbox } from "@/lib/public-map/metro-bounds";
import type {
  MetroFeatureProperties,
  MetroGeoJson,
  MetroIndexManifest,
} from "@/lib/public-map/metro-types";
import { METRO_INDEX_URL } from "@/lib/public-map/metro-types";
import type { MetroCityId } from "@/lib/public-map/metro-line-colors";
import {
  featureInBounds,
  lineStyleForBand,
  resolveMetroZoomBand,
  stationLabelHtml,
  stationLabelVisible,
  stationMarkerStyle,
  stationVisible,
} from "@/lib/public-map/seoul-metro-overlay-styles";

const SUBWAY_PANE = "tkad-subway-pane";
const SUBWAY_PANE_Z = 350;

type ChunkRuntime = {
  cityId: MetroCityId;
  linesLayer: L.GeoJSON;
  stationsLayer: L.LayerGroup;
  labelsLayer: L.LayerGroup;
};

type Props = {
  lightTiles: boolean;
};

function normalizeGeo(
  data: MetroGeoJson,
  cityId: MetroCityId,
): MetroGeoJson {
  return {
    type: "FeatureCollection",
    features: data.features.map((f) => ({
      ...f,
      properties: {
        ...f.properties,
        cityId: f.properties.cityId ?? cityId,
      },
    })),
  };
}

function buildChunkLayers(
  data: MetroGeoJson,
  cityId: MetroCityId,
  map: L.Map,
  lightTiles: boolean,
): ChunkRuntime {
  const geo = normalizeGeo(data, cityId);

  const linesLayer = L.geoJSON(
    {
      type: "FeatureCollection",
      features: geo.features.filter((f) => f.properties.kind === "line"),
    } as GeoJSON.FeatureCollection,
    {
      pane: SUBWAY_PANE,
      interactive: false,
      style: () => ({ opacity: 0, weight: 0 }),
      onEachFeature: (feature, layer) => {
        (layer as L.Layer & { feature?: GeoJSON.Feature }).feature = feature;
      },
    },
  );

  const stationsLayer = L.layerGroup([], { pane: SUBWAY_PANE });
  const labelsLayer = L.layerGroup([], { pane: SUBWAY_PANE });

  for (const feature of geo.features) {
    if (feature.properties.kind !== "station") continue;
    if (feature.geometry.type !== "Point") continue;
    const [lng, lat] = feature.geometry.coordinates;
    const props = feature.properties;
    const circle = L.circleMarker([lat, lng], {
      ...stationMarkerStyle(props.color, !!props.isTransfer, lightTiles),
      pane: SUBWAY_PANE,
      interactive: false,
    });
    circle.feature = feature as GeoJSON.Feature<GeoJSON.Point, MetroFeatureProperties>;
    stationsLayer.addLayer(circle);

    const labelIcon = L.divIcon({
      className: "tkad-metro-label",
      html: stationLabelHtml(props.nameKo ?? "", lightTiles),
      iconSize: [0, 0],
      iconAnchor: [0, 10],
    });
    const label = L.marker([lat, lng], {
      icon: labelIcon,
      pane: SUBWAY_PANE,
      interactive: false,
      opacity: 0,
    });
    label.feature = feature as GeoJSON.Feature<GeoJSON.Point, MetroFeatureProperties>;
    labelsLayer.addLayer(label);
  }

  linesLayer.addTo(map);
  stationsLayer.addTo(map);
  labelsLayer.addTo(map);

  return { cityId, linesLayer, stationsLayer, labelsLayer };
}

/** Nationwide metro overlay — manifest index + bounds-based chunk fetch */
export function MetroOverlayLayer({ lightTiles }: Props) {
  const map = useMap();
  const manifestRef = useRef<MetroIndexManifest | null>(null);
  const chunksRef = useRef<Map<MetroCityId, ChunkRuntime>>(new Map());
  const loadingRef = useRef<Set<MetroCityId>>(new Set());
  const lightTilesRef = useRef(lightTiles);
  const debounceRef = useRef<number | undefined>(undefined);

  lightTilesRef.current = lightTiles;

  useEffect(() => {
    if (!map.getPane(SUBWAY_PANE)) {
      const pane = map.createPane(SUBWAY_PANE);
      pane.style.zIndex = String(SUBWAY_PANE_Z);
    }
  }, [map]);

  useEffect(() => {
    let cancelled = false;

    function applyMetroStyles(m: L.Map) {
      const boundsAdapter = {
        contains: (latlng: [number, number]) => m.getBounds().contains(latlng),
      };
      const zoom = m.getZoom();
      const band = resolveMetroZoomBand(zoom);
      const light = lightTilesRef.current;
      const showStations = stationVisible(band);

      for (const chunk of chunksRef.current.values()) {
        chunk.linesLayer.eachLayer((layer) => {
          if (!(layer instanceof L.Path)) return;
          const feature = (layer as L.Path & { feature?: GeoJSON.Feature })
            .feature as GeoJSON.Feature<
            GeoJSON.LineString,
            MetroFeatureProperties
          >;
          if (!feature?.properties) return;
          const inView = featureInBounds(feature, boundsAdapter);
          if (!inView || band === "hidden") {
            layer.setStyle({ opacity: 0, weight: 0 });
            return;
          }
          layer.setStyle(
            lineStyleForBand(feature.properties.color, light, band),
          );
        });

        chunk.stationsLayer.eachLayer((layer) => {
          if (!(layer instanceof L.CircleMarker)) return;
          const feature = (layer as L.CircleMarker & { feature?: GeoJSON.Feature })
            .feature as GeoJSON.Feature<GeoJSON.Point, MetroFeatureProperties>;
          if (!feature?.properties) return;
          const inView = featureInBounds(feature, boundsAdapter);
          if (!showStations || !inView || band === "hidden") {
            layer.setStyle({ opacity: 0, fillOpacity: 0 });
            return;
          }
          layer.setStyle(
            stationMarkerStyle(
              feature.properties.color,
              !!feature.properties.isTransfer,
              light,
            ),
          );
        });

        chunk.labelsLayer.eachLayer((layer) => {
          if (!(layer instanceof L.Marker)) return;
          const feature = (layer as L.Marker & { feature?: GeoJSON.Feature })
            .feature as
            | GeoJSON.Feature<GeoJSON.Point, MetroFeatureProperties>
            | undefined;
          if (!feature?.properties) return;
          const inView = featureInBounds(feature, boundsAdapter);
          const show =
            showStations &&
            inView &&
            stationLabelVisible(band, !!feature.properties.isTransfer);
          layer.setOpacity(show ? 1 : 0);
        });
      }
    }

    async function ensureVisibleChunks() {
      const manifest = manifestRef.current;
      if (!manifest || cancelled) return;

      const viewport = mapBoundsToMetroBbox(map.getBounds());
      const needed = manifest.chunks.filter((c) =>
        chunkIntersectsViewport(c.bbox, viewport),
      );

      await Promise.all(
        needed.map(async (chunk) => {
          const id = chunk.id;
          if (chunksRef.current.has(id) || loadingRef.current.has(id)) return;
          loadingRef.current.add(id);
          try {
            const res = await fetch(chunk.url);
            if (!res.ok) throw new Error(`geo ${id} ${res.status}`);
            const data = (await res.json()) as MetroGeoJson;
            if (cancelled) return;
            if (chunksRef.current.has(id)) return;
            chunksRef.current.set(
              id,
              buildChunkLayers(data, id, map, lightTilesRef.current),
            );
            applyMetroStyles(map);
          } catch (e) {
            console.error(`[MetroOverlayLayer] chunk ${id} failed`, e);
          } finally {
            loadingRef.current.delete(id);
          }
        }),
      );
    }

    const scheduleUpdate = () => {
      if (debounceRef.current !== undefined) {
        window.clearTimeout(debounceRef.current);
      }
      debounceRef.current = window.setTimeout(() => {
        void ensureVisibleChunks().then(() => applyMetroStyles(map));
      }, 100);
    };

    void (async () => {
      try {
        const res = await fetch(METRO_INDEX_URL);
        if (!res.ok) throw new Error(`index ${res.status}`);
        manifestRef.current = (await res.json()) as MetroIndexManifest;
        if (cancelled) return;
        await ensureVisibleChunks();
        applyMetroStyles(map);
      } catch (e) {
        console.error("[MetroOverlayLayer] index load failed", e);
      }
    })();

    map.on("moveend", scheduleUpdate);
    map.on("zoomend", scheduleUpdate);

    return () => {
      cancelled = true;
      map.off("moveend", scheduleUpdate);
      map.off("zoomend", scheduleUpdate);
      if (debounceRef.current !== undefined) {
        window.clearTimeout(debounceRef.current);
      }
      for (const chunk of chunksRef.current.values()) {
        chunk.linesLayer.remove();
        chunk.stationsLayer.remove();
        chunk.labelsLayer.remove();
      }
      chunksRef.current.clear();
      loadingRef.current.clear();
    };
  }, [map]);

  useEffect(() => {
    lightTilesRef.current = lightTiles;
    map.fire("moveend");
  }, [lightTiles, map]);

  return null;
}

/** @deprecated Use MetroOverlayLayer */
export const SeoulMetroOverlayLayer = MetroOverlayLayer;

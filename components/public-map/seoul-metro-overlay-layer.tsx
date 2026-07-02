"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";
import { SEOUL_METRO_GEO_URL } from "@/lib/public-map/seoul-metro-types";
import type {
  SeoulMetroFeatureProperties,
  SeoulMetroGeoJson,
} from "@/lib/public-map/seoul-metro-types";
import {
  featureInBounds,
  lineStyleForBand,
  resolveMetroZoomBand,
  stationLabelHtml,
  stationLabelVisible,
  stationMarkerStyle,
  stationVisible,
  type MetroZoomBand,
} from "@/lib/public-map/seoul-metro-overlay-styles";

const SUBWAY_PANE = "tkad-subway-pane";
const SUBWAY_PANE_Z = 350;

type Props = {
  lightTiles: boolean;
};

export function SeoulMetroOverlayLayer({ lightTiles }: Props) {
  const map = useMap();
  const geoRef = useRef<SeoulMetroGeoJson | null>(null);
  const linesLayerRef = useRef<L.GeoJSON | null>(null);
  const stationsLayerRef = useRef<L.LayerGroup | null>(null);
  const labelsLayerRef = useRef<L.LayerGroup | null>(null);
  const lightTilesRef = useRef(lightTiles);
  const debounceRef = useRef<ReturnType<typeof window.setTimeout> | undefined>(
    undefined,
  );

  lightTilesRef.current = lightTiles;

  useEffect(() => {
    if (!map.getPane(SUBWAY_PANE)) {
      const pane = map.createPane(SUBWAY_PANE);
      pane.style.zIndex = String(SUBWAY_PANE_Z);
    }
  }, [map]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch(SEOUL_METRO_GEO_URL);
        if (!res.ok) throw new Error(`geo fetch ${res.status}`);
        const data = (await res.json()) as SeoulMetroGeoJson;
        if (cancelled) return;
        geoRef.current = data;

        const linesLayer = L.geoJSON(
          {
            type: "FeatureCollection",
            features: data.features.filter((f) => f.properties.kind === "line"),
          },
          {
            pane: SUBWAY_PANE,
            interactive: false,
            style: () => ({ opacity: 0, weight: 0 }),
            onEachFeature: (feature, layer) => {
              (layer as L.Layer & { feature?: GeoJSON.Feature }).feature = feature;
            },
          },
        );
        linesLayerRef.current = linesLayer;

        const stationsLayer = L.layerGroup([], { pane: SUBWAY_PANE });
        const labelsLayer = L.layerGroup([], { pane: SUBWAY_PANE });
        stationsLayerRef.current = stationsLayer;
        labelsLayerRef.current = labelsLayer;

        const stationFeatures = data.features.filter(
          (f) => f.properties.kind === "station",
        );
        for (const feature of stationFeatures) {
          if (feature.geometry.type !== "Point") continue;
          const [lng, lat] = feature.geometry.coordinates;
          const props = feature.properties;
          const circle = L.circleMarker([lat, lng], {
            ...stationMarkerStyle(props.color, !!props.isTransfer, lightTilesRef.current),
            pane: SUBWAY_PANE,
            interactive: false,
          });
          circle.feature = feature as GeoJSON.Feature;
          stationsLayer.addLayer(circle);

          const labelIcon = L.divIcon({
            className: "tkad-metro-label",
            html: stationLabelHtml(props.nameKo ?? "", lightTilesRef.current),
            iconSize: [0, 0],
            iconAnchor: [0, 10],
          });
          const label = L.marker([lat, lng], {
            icon: labelIcon,
            pane: SUBWAY_PANE,
            interactive: false,
            opacity: 0,
          });
          label.feature = feature as GeoJSON.Feature;
          labelsLayer.addLayer(label);
        }

        linesLayer.addTo(map);
        stationsLayer.addTo(map);
        labelsLayer.addTo(map);

        applyMetroStyles(map);
      } catch (e) {
        console.error("[SeoulMetroOverlayLayer] load failed", e);
      }
    })();

    function applyMetroStyles(m: L.Map) {
      const geo = geoRef.current;
      const linesLayer = linesLayerRef.current;
      const stationsLayer = stationsLayerRef.current;
      const labelsLayer = labelsLayerRef.current;
      if (!geo || !linesLayer || !stationsLayer || !labelsLayer) return;

      const zoom = m.getZoom();
      const band = resolveMetroZoomBand(zoom);
      const bounds = m.getBounds();
      const boundsAdapter = {
        contains: (latlng: [number, number]) => m.getBounds().contains(latlng),
      };
      const light = lightTilesRef.current;

      linesLayer.eachLayer((layer) => {
        if (!(layer instanceof L.Path)) return;
        const feature = (layer as L.Path & { feature?: GeoJSON.Feature })
          .feature as GeoJSON.Feature<GeoJSON.LineString, SeoulMetroFeatureProperties>;
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

      const showStations = stationVisible(band);
      stationsLayer.eachLayer((layer) => {
        if (!(layer instanceof L.CircleMarker)) return;
        const feature = (layer as L.CircleMarker & { feature?: GeoJSON.Feature })
          .feature as GeoJSON.Feature<GeoJSON.Point, SeoulMetroFeatureProperties>;
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

      labelsLayer.eachLayer((layer) => {
        const feature = (layer as L.Marker & { feature?: GeoJSON.Feature }).feature as
          | GeoJSON.Feature<GeoJSON.Point, SeoulMetroFeatureProperties>
          | undefined;
        if (!feature?.properties) return;
        const inView = featureInBounds(feature, boundsAdapter);
        const show = showStations &&
          inView &&
          stationLabelVisible(band, !!feature.properties.isTransfer);
        layer.setOpacity(show ? 1 : 0);
      });
    }

    const scheduleUpdate = () => {
      if (debounceRef.current !== undefined) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => applyMetroStyles(map), 100);
    };

    map.on("moveend", scheduleUpdate);
    map.on("zoomend", scheduleUpdate);

    return () => {
      cancelled = true;
      map.off("moveend", scheduleUpdate);
      map.off("zoomend", scheduleUpdate);
      if (debounceRef.current !== undefined) window.clearTimeout(debounceRef.current);
      linesLayerRef.current?.remove();
      stationsLayerRef.current?.remove();
      labelsLayerRef.current?.remove();
      linesLayerRef.current = null;
      stationsLayerRef.current = null;
      labelsLayerRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    lightTilesRef.current = lightTiles;
    map.fire("moveend");
  }, [lightTiles, map]);

  return null;
}

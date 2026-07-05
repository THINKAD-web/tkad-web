import type { PathOptions } from "leaflet";
import type { SeoulMetroFeatureProperties } from "@/lib/public-map/seoul-metro-types";
import type { RailOperator } from "@/lib/public-map/ktx-srt-stations";
import { railOperatorLabel } from "@/lib/public-map/ktx-srt-stations";

/** Leaflet zoom → 지하철 노출 단계 */
export type MetroZoomBand =
  | "hidden"
  | "linesThin"
  | "stations"
  | "transferLabels"
  | "allLabels";

export function resolveMetroZoomBand(zoom: number): MetroZoomBand {
  if (zoom < 9) return "hidden";
  if (zoom < 11) return "linesThin";
  if (zoom < 12) return "stations";
  if (zoom < 13) return "transferLabels";
  return "allLabels";
}

export function lineStyleForBand(
  color: string,
  lightTiles: boolean,
  band: MetroZoomBand,
): PathOptions {
  if (band === "hidden") {
    return { opacity: 0, weight: 0 };
  }
  const thin = band === "linesThin";
  return {
    color,
    weight: thin ? 1.5 : lightTiles ? 2 : 2.5,
    opacity: thin
      ? lightTiles
        ? 0.28
        : 0.42
      : lightTiles
        ? 0.4
        : 0.7,
    lineCap: "round",
    lineJoin: "round",
  };
}

export function stationVisible(band: MetroZoomBand): boolean {
  return (
    band === "stations" ||
    band === "transferLabels" ||
    band === "allLabels"
  );
}

export function stationLabelVisible(
  band: MetroZoomBand,
  isTransfer: boolean,
): boolean {
  if (band === "allLabels") return true;
  if (band === "transferLabels") return isTransfer;
  return false;
}

/** KTX·SRT 역 — 도시철도 역보다 한 단계 일찍 (zoom≥10), 전국 뷰(<9)는 숨김 */
export function ktxSrtStationVisible(zoom: number): boolean {
  return zoom >= 10;
}

export function ktxSrtLabelVisible(zoom: number): boolean {
  return zoom >= 10;
}

export function ktxSrtMarkerHtml(
  color: string,
  lightTiles: boolean,
): string {
  const border = lightTiles ? "#1e293b" : "#f8fafc";
  const shadow = lightTiles
    ? "0 0 2px #fff"
    : "0 0 3px #0a0a12";
  return `<span style="display:block;width:10px;height:10px;background:${color};border:2px solid ${border};box-shadow:${shadow};transform:rotate(45deg);pointer-events:none"></span>`;
}

export function ktxSrtLabelHtml(
  nameKo: string,
  operator: RailOperator,
  lightTiles: boolean,
): string {
  const tag = railOperatorLabel(operator);
  const shadow = lightTiles
    ? "0 0 2px #fff,0 0 4px #fff"
    : "0 0 3px #0a0a12,0 0 6px #0a0a12";
  const color = lightTiles ? "#1e293b" : "#f1f5f9";
  const accent = lightTiles ? "#475569" : "#cbd5e1";
  const base = nameKo.replace(/역$/, "");
  return `<span style="font:600 11px/1.2 system-ui,sans-serif;color:${color};text-shadow:${shadow};white-space:nowrap;pointer-events:none">${escapeHtml(base)}역<span style="font-weight:500;color:${accent}">(${escapeHtml(tag)})</span></span>`;
}

export function stationMarkerStyle(
  color: string,
  isTransfer: boolean,
  lightTiles: boolean,
): PathOptions {
  return {
    color: "#ffffff",
    fillColor: color,
    fillOpacity: lightTiles ? 0.75 : 0.85,
    weight: isTransfer ? 2 : 1,
    opacity: 0.9,
    radius: isTransfer ? 4.5 : 3,
  };
}

export function stationLabelHtml(
  name: string,
  lightTiles: boolean,
): string {
  const shadow = lightTiles
    ? "0 0 2px #fff,0 0 4px #fff"
    : "0 0 3px #0a0a12,0 0 6px #0a0a12";
  const color = lightTiles ? "#1e293b" : "#f1f5f9";
  return `<span style="font:500 11px/1.2 system-ui,sans-serif;color:${color};text-shadow:${shadow};white-space:nowrap;pointer-events:none">${escapeHtml(name)}</span>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function featureInBounds(
  feature: GeoJSON.Feature,
  bounds: { contains: (latlng: [number, number]) => boolean },
): boolean {
  const geom = feature.geometry;
  if (!geom) return false;
  if (geom.type === "Point") {
    const [lng, lat] = geom.coordinates;
    return bounds.contains([lat, lng]);
  }
  if (geom.type === "LineString") {
    return geom.coordinates.some(([lng, lat]) => bounds.contains([lat, lng]));
  }
  if (geom.type === "MultiLineString") {
    return geom.coordinates.some((line) =>
      line.some(([lng, lat]) => bounds.contains([lat, lng])),
    );
  }
  return true;
}

/** 공개 다크 지도 마커 핀 SVG — `/media/map`·매체 상세 공통 */

import L from "leaflet";
import { pinColorForVisibilityScore } from "@/lib/map-pin-visibility-colors";

export function pinColorForType(type: string): {
  fill: string;
  stroke: string;
  text: string;
} {
  const t = (type || "").toLowerCase();
  if (t.includes("office") || t.includes("thinkad")) {
    return { fill: "#a855f7", stroke: "#ead6ff", text: "#0a0a0c" };
  }
  if (t.includes("digital")) {
    return { fill: "#22c55e", stroke: "#a3ffcc", text: "#0a0a0c" };
  }
  if (t.includes("static")) {
    return { fill: "#22d3ee", stroke: "#bff7ff", text: "#0a0a0c" };
  }
  if (t.includes("mobile")) {
    return { fill: "#fb7185", stroke: "#ffd3db", text: "#0a0a0c" };
  }
  if (t.includes("network")) {
    return { fill: "#a855f7", stroke: "#ead6ff", text: "#0a0a0c" };
  }
  return { fill: "#a855f7", stroke: "#ead6ff", text: "#0a0a0c" };
}

export function pinLetterForType(type: string): string {
  const t = (type || "").toLowerCase();
  if (t.includes("office") || t.includes("thinkad")) return "T";
  if (t.includes("digital")) return "D";
  if (t.includes("static")) return "S";
  if (t.includes("mobile")) return "M";
  if (t.includes("network")) return "N";
  return "•";
}

const MAP_PIN_SELECTION_RING = "#7c3aed";

export function pinDataUrl(
  type: string,
  selected: boolean,
  forLightBackground = false,
  visibilityScore?: number | null,
): string {
  const useScore = visibilityScore !== undefined;
  const { fill, stroke, text } = useScore
    ? pinColorForVisibilityScore(visibilityScore)
    : pinColorForType(type);
  const w = selected ? 44 : 40;
  const h = selected ? 52 : 48;
  const label = pinLetterForType(type);
  const ring = selected ? 3 : 2;
  const font = selected ? 14 : 13;

  const bodyFill = useScore
    ? forLightBackground
      ? "#ffffff"
      : "rgba(8,8,12,0.94)"
    : selected
      ? fill
      : forLightBackground
        ? "#ffffff"
        : "rgba(8,8,12,0.94)";
  const bodyStroke = selected
    ? MAP_PIN_SELECTION_RING
    : useScore
      ? forLightBackground
        ? "rgba(15,23,42,0.45)"
        : "rgba(255,255,255,0.14)"
      : forLightBackground
        ? "rgba(15,23,42,0.55)"
        : "rgba(255,255,255,0.14)";
  const coreFill = useScore
    ? fill
    : selected
      ? fill
      : forLightBackground
        ? "#f8fafc"
        : "rgba(12,12,18,0.98)";
  const labelFill = useScore ? text : selected ? text : forLightBackground ? fill : stroke;

  const shadowFilter = forLightBackground
    ? `<filter id="pinShadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="1.5" stdDeviation="1.8" flood-color="rgba(15,23,42,0.35)"/></filter>`
    : "";
  const shadowGroup = forLightBackground ? ` filter="url(#pinShadow)"` : "";
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 44 52">
    <defs>
      ${shadowFilter}
      <linearGradient id="ring" x1="8" y1="8" x2="36" y2="36" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="${stroke}" stop-opacity="1"/>
        <stop offset="0.45" stop-color="#ffffff" stop-opacity="0.5"/>
        <stop offset="1" stop-color="${stroke}" stop-opacity="1"/>
      </linearGradient>
    </defs>
    <g${shadowGroup}>
      <path d="M22 51C31 39 36 30.5 36 22.5C36 12.85 29.15 5 22 5C14.85 5 8 12.85 8 22.5C8 30.5 13 39 22 51Z" fill="${bodyFill}" stroke="${bodyStroke}" stroke-width="${selected ? 2.25 : forLightBackground ? 2 : 1.75}"${selected ? ` stroke-opacity="0.88"` : ""}/>
      <circle cx="22" cy="22" r="11.8" fill="${coreFill}" stroke="url(#ring)" stroke-width="${ring}"/>
      <text x="22" y="26.8" text-anchor="middle" font-family="ui-monospace, monospace" font-size="${font}" font-weight="800" fill="${labelFill}">${label}</text>
    </g>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.trim())}`;
}

export function leafletPinIcon(
  type: string,
  selected: boolean,
  hovered: boolean,
  forLightBackground = false,
  visibilityScore?: number | null,
) {
  const highlighted = selected || hovered;
  const w = highlighted ? 44 : 40;
  const h = highlighted ? 52 : 48;
  return L.icon({
    iconUrl: pinDataUrl(type, highlighted, forLightBackground, visibilityScore),
    iconSize: [w, h],
    iconAnchor: [w / 2, h],
    popupAnchor: [0, -h + 8],
  });
}

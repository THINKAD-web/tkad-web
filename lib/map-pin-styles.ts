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

/** 가시성 점수·선택·hover 에 따른 핀 크기 (과하지 않게 미세 차등) */
export function pinDimensions(
  visibilityScore: number | null | undefined,
  selected: boolean,
  hovered: boolean,
): { w: number; h: number } {
  const score =
    visibilityScore != null && visibilityScore > 0 ? visibilityScore : 0;
  const scoreBoost = Math.min(3, Math.floor(score / 32));
  const selectBoost = selected ? 5 : hovered ? 2 : 0;
  const w = 38 + scoreBoost + selectBoost;
  const h = Math.round(w * 1.22);
  return { w, h };
}

export function pinDataUrl(
  type: string,
  selected: boolean,
  hovered: boolean,
  forLightBackground = false,
  visibilityScore?: number | null,
): string {
  const highlighted = selected || hovered;
  const useScore = visibilityScore !== undefined;
  const { fill, stroke, text } = useScore
    ? pinColorForVisibilityScore(visibilityScore)
    : pinColorForType(type);
  const { w, h } = pinDimensions(visibilityScore, selected, hovered);
  const label = pinLetterForType(type);
  const ring = selected ? 3.5 : hovered ? 3 : 2;
  const font = selected ? 14 : hovered ? 13.5 : 13;

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
  const labelFill = useScore
    ? text
    : selected
      ? text
      : forLightBackground
        ? fill
        : stroke;

  const shadowOpacity = forLightBackground ? 0.32 : 0.55;
  const selectionGlow = selected
    ? `<circle cx="22" cy="22" r="17.5" fill="none" stroke="${MAP_PIN_SELECTION_RING}" stroke-width="2.5" stroke-opacity="0.55"/>`
    : hovered
      ? `<circle cx="22" cy="22" r="16.5" fill="none" stroke="${MAP_PIN_SELECTION_RING}" stroke-width="1.5" stroke-opacity="0.35"/>`
      : "";

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 44 52">
    <defs>
      <filter id="pinShadow" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="2" stdDeviation="2.2" flood-color="rgba(0,0,0,${shadowOpacity})"/>
      </filter>
      <linearGradient id="ring" x1="8" y1="8" x2="36" y2="36" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="${stroke}" stop-opacity="1"/>
        <stop offset="0.45" stop-color="#ffffff" stop-opacity="0.55"/>
        <stop offset="1" stop-color="${stroke}" stop-opacity="1"/>
      </linearGradient>
    </defs>
    <g filter="url(#pinShadow)">
      ${selectionGlow}
      <path d="M22 51C31 39 36 30.5 36 22.5C36 12.85 29.15 5 22 5C14.85 5 8 12.85 8 22.5C8 30.5 13 39 22 51Z" fill="${bodyFill}" stroke="${bodyStroke}" stroke-width="${selected ? 2.5 : forLightBackground ? 2 : 1.75}"${selected ? ` stroke-opacity="0.95"` : ""}/>
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
  const { w, h } = pinDimensions(visibilityScore, selected, hovered);
  const classes = [
    "tkad-map-pin-icon",
    selected ? "tkad-map-pin-icon--selected" : "",
    hovered && !selected ? "tkad-map-pin-icon--hovered" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return L.icon({
    iconUrl: pinDataUrl(
      type,
      selected,
      hovered,
      forLightBackground,
      visibilityScore,
    ),
    iconSize: [w, h],
    iconAnchor: [w / 2, h],
    popupAnchor: [0, -h + 8],
    className: classes,
  });
}

/** 선택·hover 시 Leaflet z-index — 핀이 위로 올라오게 */
export function pinZIndexOffset(selected: boolean, hovered: boolean): number {
  if (selected) return 1200;
  if (hovered) return 600;
  return 0;
}

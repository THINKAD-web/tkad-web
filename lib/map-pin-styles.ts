/** 공개 다크 지도 마커 핀 — `/media/map`·매체 상세 공통 (단색 원형, popply 스타일) */

import L from "leaflet";
import {
  pinColorForVisibilityScore,
  visibilityPinTierForScore,
} from "@/lib/map-pin-visibility-colors";

export function pinColorForType(type: string): {
  fill: string;
  stroke: string;
  text: string;
} {
  const t = (type || "").toLowerCase();
  if (t.includes("office") || t.includes("thinkad")) {
    return { fill: "#a855f7", stroke: "#7c3aed", text: "#ffffff" };
  }
  if (t.includes("digital")) {
    return { fill: "#22c55e", stroke: "#16a34a", text: "#ffffff" };
  }
  if (t.includes("static")) {
    return { fill: "#22d3ee", stroke: "#0891b2", text: "#0f172a" };
  }
  if (t.includes("mobile")) {
    return { fill: "#fb7185", stroke: "#e11d48", text: "#ffffff" };
  }
  if (t.includes("network")) {
    return { fill: "#a855f7", stroke: "#7c3aed", text: "#ffffff" };
  }
  return { fill: "#f97316", stroke: "#ea580c", text: "#ffffff" };
}

export function pinLetterForType(type: string): string {
  const t = (type || "").toLowerCase();
  if (t.includes("office") || t.includes("thinkad")) return "T";
  if (t.includes("digital")) return "D";
  if (t.includes("static")) return "S";
  if (t.includes("mobile")) return "M";
  if (t.includes("network")) return "N";
  return "";
}

const MAP_PIN_SELECTION_RING = "#00E5FF";

const pinDataUrlCache = new Map<string, string>();
const leafletIconCache = new Map<string, L.Icon>();

function pinIconCacheKey(
  type: string,
  highlighted: boolean,
  forLightBackground: boolean,
  visibilityScore?: number | null,
): string {
  const useScore = visibilityScore !== undefined;
  const tier = useScore ? visibilityPinTierForScore(visibilityScore) : "type";
  const typeKey = useScore ? "" : (type || "").toLowerCase();
  return `${typeKey}|${tier}|${forLightBackground ? 1 : 0}|${highlighted ? 1 : 0}`;
}

function buildPinDataUrl(
  type: string,
  selected: boolean,
  forLightBackground = false,
  visibilityScore?: number | null,
): string {
  const useScore = visibilityScore !== undefined;
  const { fill, stroke, text } = useScore
    ? pinColorForVisibilityScore(visibilityScore)
    : pinColorForType(type);
  const size = selected ? 34 : 30;
  const ring = selected ? 3 : 2;
  const label = pinLetterForType(type);
  const ringColor = selected
    ? MAP_PIN_SELECTION_RING
    : forLightBackground
      ? "rgba(15,23,42,0.55)"
      : "rgba(255,255,255,0.9)";
  const labelFill = text;
  const showLabel = label.length > 0 && !useScore;

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="14" fill="${fill}" stroke="${ringColor}" stroke-width="${ring}"/>
    ${
      showLabel
        ? `<text x="16" y="20.5" text-anchor="middle" font-family="ui-sans-serif, system-ui, sans-serif" font-size="11" font-weight="800" fill="${labelFill}">${label}</text>`
        : ""
    }
    ${
      useScore && selected
        ? `<circle cx="16" cy="16" r="5.5" fill="none" stroke="${MAP_PIN_SELECTION_RING}" stroke-width="1.75" opacity="0.95"/>`
        : ""
    }
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.trim())}`;
}

export function pinDataUrl(
  type: string,
  selected: boolean,
  forLightBackground = false,
  visibilityScore?: number | null,
): string {
  const key = pinIconCacheKey(type, selected, forLightBackground, visibilityScore);
  const cached = pinDataUrlCache.get(key);
  if (cached) return cached;
  const url = buildPinDataUrl(type, selected, forLightBackground, visibilityScore);
  pinDataUrlCache.set(key, url);
  return url;
}

export function leafletPinIcon(
  type: string,
  selected: boolean,
  hovered: boolean,
  forLightBackground = false,
  visibilityScore?: number | null,
) {
  const highlighted = selected || hovered;
  const key = pinIconCacheKey(type, highlighted, forLightBackground, visibilityScore);
  const cached = leafletIconCache.get(key);
  if (cached) return cached;

  const size = highlighted ? 34 : 30;
  const icon = L.icon({
    iconUrl: pinDataUrl(type, highlighted, forLightBackground, visibilityScore),
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2)],
  });
  leafletIconCache.set(key, icon);
  return icon;
}

/** 테스트·벤치마크용 */
export function clearMapPinIconCaches(): void {
  pinDataUrlCache.clear();
  leafletIconCache.clear();
}

export function mapPinIconCacheSizes(): { dataUrls: number; icons: number } {
  return {
    dataUrls: pinDataUrlCache.size,
    icons: leafletIconCache.size,
  };
}

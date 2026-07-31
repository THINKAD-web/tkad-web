/** 지도 핀 SVG data URL — Leaflet 비의존 (테스트·범례 공용) */

import {
  visibilityPinTierDefForScore,
  visibilityPinTierForScore,
} from "@/lib/map-pin-visibility-colors";

export type PinShapeKind = "circle" | "rounded-square" | "diamond";

export function pinShapeForType(type: string): PinShapeKind {
  const t = (type || "").toLowerCase();
  if (t.includes("static")) return "rounded-square";
  if (t.includes("network")) return "diamond";
  return "circle";
}

export function pinColorForType(type: string): {
  fill: string;
  stroke: string;
  text: string;
} {
  const t = (type || "").toLowerCase();
  if (t.includes("office") || t.includes("thinkad")) {
    return { fill: "#ff6200", stroke: "#c24e00", text: "#ffffff" };
  }
  if (t.includes("digital")) {
    return { fill: "#ff6200", stroke: "#ea580c", text: "#ffffff" };
  }
  if (t.includes("static")) {
    return { fill: "#334155", stroke: "#475569", text: "#ffffff" };
  }
  if (t.includes("mobile")) {
    return { fill: "#78716c", stroke: "#a8a29e", text: "#ffffff" };
  }
  if (t.includes("network")) {
    return { fill: "#1e4976", stroke: "#2d5f8a", text: "#ffffff" };
  }
  return { fill: "#71717a", stroke: "#a1a1aa", text: "#ffffff" };
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

export type MediaTypePinLegendEntry = {
  letter: string;
  sampleType: string;
  labelKo: string;
  labelEn: string;
  noteKo?: string;
  noteEn?: string;
};

/** `/media/map` 범례 — type별 미니 핀 (mobile 은 지도 핀 미표시) */
export const MEDIA_TYPE_PIN_LEGEND_ENTRIES: readonly MediaTypePinLegendEntry[] =
  [
    {
      letter: "D",
      sampleType: "digital",
      labelKo: "디지털",
      labelEn: "Digital",
    },
    {
      letter: "S",
      sampleType: "static",
      labelKo: "고정",
      labelEn: "Static",
    },
    {
      letter: "M",
      sampleType: "mobile",
      labelKo: "이동",
      labelEn: "Mobile",
      noteKo: "지도 핀 없음 · 서비스 지역 배지로 표시",
      noteEn: "No map pin · shown as service region badge",
    },
    {
      letter: "N",
      sampleType: "network",
      labelKo: "네트워크",
      labelEn: "Network",
    },
  ] as const;

const MAP_PIN_SELECTION_RING = "#ff6200";

const pinDataUrlCache = new Map<string, string>();

function buildInnerShape(
  shape: PinShapeKind,
  fill: string,
  innerEdge: string,
): string {
  switch (shape) {
    case "rounded-square":
      return `<rect x="5" y="5" width="22" height="22" rx="5" fill="${fill}" stroke="${innerEdge}" stroke-width="1"/>`;
    case "diamond":
      return `<polygon points="16,5 27,16 16,27 5,16" fill="${fill}" stroke="${innerEdge}" stroke-width="1"/>`;
    default:
      return `<circle cx="16" cy="16" r="11" fill="${fill}" stroke="${innerEdge}" stroke-width="1"/>`;
  }
}

function buildOuterRing(
  shape: PinShapeKind,
  outerStroke: string,
  outerRing: number,
): string {
  switch (shape) {
    case "rounded-square":
      return `<rect x="2.5" y="2.5" width="27" height="27" rx="6" fill="none" stroke="${outerStroke}" stroke-width="${outerRing}"/>`;
    case "diamond":
      return `<polygon points="16,2 30,16 16,30 2,16" fill="none" stroke="${outerStroke}" stroke-width="${outerRing}"/>`;
    default:
      return `<circle cx="16" cy="16" r="14" fill="none" stroke="${outerStroke}" stroke-width="${outerRing}"/>`;
  }
}

function buildSelectionIndicator(shape: PinShapeKind): string {
  switch (shape) {
    case "rounded-square":
      return `<rect x="10.5" y="10.5" width="11" height="11" rx="2.5" fill="none" stroke="${MAP_PIN_SELECTION_RING}" stroke-width="1.75" opacity="0.95"/>`;
    case "diamond":
      return `<polygon points="16,10.5 21.5,16 16,21.5 10.5,16" fill="none" stroke="${MAP_PIN_SELECTION_RING}" stroke-width="1.75" opacity="0.95"/>`;
    default:
      return `<circle cx="16" cy="16" r="5.5" fill="none" stroke="${MAP_PIN_SELECTION_RING}" stroke-width="1.75" opacity="0.95"/>`;
  }
}

export function pinIconCacheKey(
  type: string,
  highlighted: boolean,
  forLightBackground: boolean,
  visibilityScore?: number | null,
): string {
  const typeKey = (type || "").toLowerCase();
  const tier = visibilityPinTierForScore(
    visibilityScore !== undefined ? visibilityScore : null,
  );
  return `${typeKey}|t${tier}|${forLightBackground ? 1 : 0}|${highlighted ? 1 : 0}`;
}

export function buildPinDataUrl(
  type: string,
  selected: boolean,
  forLightBackground = false,
  visibilityScore?: number | null,
): string {
  const { fill } = pinColorForType(type);
  const shape = pinShapeForType(type);
  const tierDef = visibilityPinTierDefForScore(
    visibilityScore !== undefined ? visibilityScore : null,
    forLightBackground,
  );
  const size = selected ? 34 : 30;
  const outerRing = selected ? 3 : 2.5;
  const outerStroke = selected ? MAP_PIN_SELECTION_RING : tierDef.stroke;
  const innerEdge = forLightBackground
    ? "rgba(15,23,42,0.18)"
    : "rgba(255,255,255,0.28)";

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32">
    ${buildInnerShape(shape, fill, innerEdge)}
    ${buildOuterRing(shape, outerStroke, outerRing)}
    ${selected ? buildSelectionIndicator(shape) : ""}
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

/** 범례 미니 핀 — 대표 tier ring + type 실루엣 */
export function pinLegendMiniDataUrl(
  type: string,
  forLightBackground = false,
  visibilityScore: number | null = 92,
): string {
  return pinDataUrl(type, false, forLightBackground, visibilityScore);
}

export function clearMapPinDataUrlCache(): void {
  pinDataUrlCache.clear();
}

export function mapPinDataUrlCacheSize(): number {
  return pinDataUrlCache.size;
}

/** Leaflet 핀 아이콘 — SVG 는 `map-pin-icon-data` */

import L from "leaflet";
import {
  clearMapPinDataUrlCache,
  mapPinDataUrlCacheSize,
  pinDataUrl,
  pinIconCacheKey,
} from "@/lib/map-pin-icon-data";

export {
  buildPinDataUrl,
  clearMapPinDataUrlCache,
  mapPinDataUrlCacheSize,
  MEDIA_TYPE_PIN_LEGEND_ENTRIES,
  pinColorForType,
  pinDataUrl,
  pinLegendMiniDataUrl,
  pinLetterForType,
  pinShapeForType,
  type MediaTypePinLegendEntry,
  type PinShapeKind,
} from "@/lib/map-pin-icon-data";

const leafletIconCache = new Map<string, L.Icon>();

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
  clearMapPinDataUrlCache();
  leafletIconCache.clear();
}

export function mapPinIconCacheSizes(): { dataUrls: number; icons: number } {
  return {
    dataUrls: mapPinDataUrlCacheSize(),
    icons: leafletIconCache.size,
  };
}

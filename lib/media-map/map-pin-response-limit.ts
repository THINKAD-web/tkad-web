import {
  mapItemShowsOnMap,
  resolveMapDisplayMode,
  type MapDisplayMode,
} from "@/lib/media-map/map-display-mode";
import { mediaItemIntersectsMapBounds } from "@/lib/media-detail-map-markers";
import type { MediaItem } from "@/lib/media-data";

export type MapBoundsBox = {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
};

/** Kakao map level (1=closest, 14=farthest) — `/media/map` view.zoom 과 동일 */
export const MAP_PIN_LIMIT_MIN = 50;
export const MAP_PIN_LIMIT_MAX = 150;
export const MAP_PIN_LIMIT_DEFAULT = 80;

/**
 * 줌 레벨별 지도 핀 반환 상한.
 * overview(멀리)일수록 적게, zoom-in 시 점진적으로 늘린다.
 */
export function resolveMapPinLimitForZoom(
  zoom: number | null | undefined,
): number {
  if (zoom == null || !Number.isFinite(zoom)) {
    return MAP_PIN_LIMIT_DEFAULT;
  }
  const z = Math.max(1, Math.min(14, Math.round(zoom)));
  if (z <= 5) return MAP_PIN_LIMIT_MAX;
  if (z <= 7) return 120;
  if (z <= 9) return MAP_PIN_LIMIT_DEFAULT;
  return MAP_PIN_LIMIT_MIN;
}

type PinSortEntry<T> = {
  item: T;
  mode: MapDisplayMode;
  inBounds: boolean;
};

function pinInBounds(
  m: MediaItem,
  bounds: MapBoundsBox | null,
): boolean {
  if (!bounds) return true;
  return mediaItemIntersectsMapBounds(m, bounds);
}

/**
 * 정렬된 카탈로그에서 지도 핀만 상한 적용.
 * - non-pin(서비스권역·좌표미상)은 항상 포함
 * - pin은 bounds 내 항목 우선, 이후 sort 순으로 limit까지
 */
export function applyMapPinResponseLimit<T extends MediaItem>(
  sortedItems: readonly T[],
  options: {
    bounds: MapBoundsBox | null;
    zoom: number | null | undefined;
    /** true면 bounds 밖 pin도 limit 미달 시 보충 가능 */
    prioritizeViewport?: boolean;
  },
): {
  items: T[];
  mapPlottableTotal: number;
  mapPinsReturned: number;
  mapPinsTruncated: boolean;
} {
  const limit = resolveMapPinLimitForZoom(options.zoom);
  const prioritizeViewport = options.prioritizeViewport ?? true;
  const bounds = options.bounds;

  const nonPinItems: T[] = [];
  const pinEntries: PinSortEntry<T>[] = [];

  for (const item of sortedItems) {
    const mode = resolveMapDisplayMode(item);
    if (mapItemShowsOnMap(mode)) {
      pinEntries.push({
        item,
        mode,
        inBounds: pinInBounds(item, bounds),
      });
    } else {
      nonPinItems.push(item);
    }
  }

  const mapPlottableTotal = pinEntries.length;
  if (mapPlottableTotal <= limit) {
    const allPins = pinEntries.map((e) => e.item);
    return {
      items: mergeSortedPinsWithNonPins(sortedItems, allPins, nonPinItems),
      mapPlottableTotal,
      mapPinsReturned: mapPlottableTotal,
      mapPinsTruncated: false,
    };
  }

  const inBounds = pinEntries.filter((e) => e.inBounds);
  const outOfBounds = pinEntries.filter((e) => !e.inBounds);
  const orderedPins = prioritizeViewport && bounds
    ? [...inBounds, ...outOfBounds]
    : pinEntries;

  const selectedPins = orderedPins.slice(0, limit).map((e) => e.item);

  return {
    items: mergeSortedPinsWithNonPins(sortedItems, selectedPins, nonPinItems),
    mapPlottableTotal,
    mapPinsReturned: selectedPins.length,
    mapPinsTruncated: true,
  };
}

/** 원본 sort 순서 유지 — 선택 pin + non-pin */
function mergeSortedPinsWithNonPins<T extends MediaItem>(
  sortedItems: readonly T[],
  selectedPins: readonly T[],
  nonPinItems: readonly T[],
): T[] {
  const selectedPinIds = new Set(selectedPins.map((m) => m.id));
  const nonPinIds = new Set(nonPinItems.map((m) => m.id));
  const out: T[] = [];
  for (const item of sortedItems) {
    if (nonPinIds.has(item.id)) {
      out.push(item);
    } else if (selectedPinIds.has(item.id)) {
      out.push(item);
    }
  }
  return out;
}

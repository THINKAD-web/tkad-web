import type { MapBrowseFilters } from "@/lib/media-map/browse-filters";

/** 이동형·버스·택시 등 — 지도 핀 없이 목록 위주 탐색 */
const MOBILE_LIST_SUBCATEGORIES = new Set([
  "vehicle_wrap",
  "bus_exterior",
  "bus_interior",
  "taxi_exterior",
  "taxi_interior",
]);

/**
 * `/media/map` — 필터가 이동형(버스·택시·래핑 등) 위주일 때 모바일 목록 시트 자동 full.
 */
export function isMapMobileListAutoExpandFilter(
  filters: Pick<MapBrowseFilters, "subCategory" | "q">,
): boolean {
  if (
    filters.subCategory &&
    MOBILE_LIST_SUBCATEGORIES.has(filters.subCategory)
  ) {
    return true;
  }
  const q = filters.q.trim();
  if (/이동형|vehicle\s*wrap|버스\s*(래핑|랩핑)|택시\s*(래핑|랩핑)/i.test(q)) {
    return true;
  }
  return false;
}

import {
  buildMobileDistrictCoverageGeoJson,
  type CoverageFeatureCollection,
} from "@/lib/geo/korea-sgg-coverage";
import { resolveItemMapDisplayMode } from "@/lib/media-map/map-display-mode";
import type { MapMapItem } from "@/components/media-map/media-map-types";

/** PoC·성능 상한 — 전국(250+)·고속버스 등은 오버레이 생략 */
export const MAP_COVERAGE_OVERLAY_MAX_DISTRICT_CODES = 32;

export type MapCoverageOverlayState = {
  geoJson: CoverageFeatureCollection;
  districtCount: number;
  sourceMediaCount: number;
};

type OverlayItem = Pick<
  MapMapItem,
  "mapDisplayMode" | "type" | "coverageDistrictCodes"
>;

export function resolveMapCoverageOverlayState(
  items: readonly OverlayItem[],
): MapCoverageOverlayState | null {
  const codes = new Set<string>();
  let sourceMediaCount = 0;

  for (const item of items) {
    if (resolveItemMapDisplayMode(item) !== "service_region") continue;
    const row = item.coverageDistrictCodes;
    if (!row?.length) continue;
    sourceMediaCount += 1;
    for (const c of row) {
      const t = c.trim();
      if (t) codes.add(t);
    }
  }

  if (sourceMediaCount === 0 || codes.size === 0) return null;
  if (codes.size > MAP_COVERAGE_OVERLAY_MAX_DISTRICT_CODES) return null;

  return {
    geoJson: buildMobileDistrictCoverageGeoJson([...codes]),
    districtCount: codes.size,
    sourceMediaCount,
  };
}

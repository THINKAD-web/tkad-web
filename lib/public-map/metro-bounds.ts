import type { MetroBbox } from "@/lib/public-map/metro-types";

/** Leaflet bounds → metro bbox with optional degree padding */
export function mapBoundsToMetroBbox(
  bounds: { getSouth: () => number; getWest: () => number; getNorth: () => number; getEast: () => number },
  paddingDeg = 0.08,
): MetroBbox {
  return {
    south: bounds.getSouth() - paddingDeg,
    west: bounds.getWest() - paddingDeg,
    north: bounds.getNorth() + paddingDeg,
    east: bounds.getEast() + paddingDeg,
  };
}

export function metroBboxesIntersect(a: MetroBbox, b: MetroBbox): boolean {
  return !(a.east < b.west || a.west > b.east || a.north < b.south || a.south > b.north);
}

export function chunkIntersectsViewport(
  chunkBbox: MetroBbox,
  viewport: MetroBbox,
): boolean {
  return metroBboxesIntersect(chunkBbox, viewport);
}

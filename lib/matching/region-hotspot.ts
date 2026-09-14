/**
 * Region hotspot types — data model·스코어링은 STEP3c.
 * 3b에서는 SharedScoringInput 타입 호환용으로만 export.
 */

export const HOTSPOT_TYPES = [
  "residential",
  "commercial",
  "airport",
  "tourist",
  "transit_corridor",
] as const;

export type HotspotType = (typeof HOTSPOT_TYPES)[number];

export type RegionHotspot = {
  regionId: string;
  zoneId?: string;
  type: HotspotType;
  weight: number;
};

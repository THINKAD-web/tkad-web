/**
 * Region hotspot types — 제주 1차 taxonomy + 공유 스코어링 입력.
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

export type MediaHotspotTag = {
  regionId: string;
  zoneId?: string;
  type: HotspotType;
  weight: number;
};

export const JEJU_ZONES = [
  {
    zoneId: "jeju_downtown",
    label: "제주 시내·중앙로",
    types: ["commercial", "residential"] as const,
  },
  {
    zoneId: "jeju_seogwipo",
    label: "서귀포",
    types: ["commercial", "tourist"] as const,
  },
  {
    zoneId: "jeju_airport",
    label: "제주공항",
    types: ["airport", "tourist", "transit_corridor"] as const,
  },
  {
    zoneId: "jeju_nohyeong",
    label: "노형·연동",
    types: ["residential", "commercial"] as const,
  },
  {
    zoneId: "jeju_ara",
    label: "애월·한림",
    types: ["tourist", "residential"] as const,
  },
  {
    zoneId: "jeju_transit",
    label: "시내·간선 버스 동선",
    types: ["transit_corridor"] as const,
  },
] as const;

export type JejuZoneId = (typeof JEJU_ZONES)[number]["zoneId"];

export function isHotspotType(v: string): v is HotspotType {
  return (HOTSPOT_TYPES as readonly string[]).includes(v);
}

export function parseMediaHotspotTags(raw: unknown): MediaHotspotTag[] | undefined {
  if (raw == null) return undefined;
  let arr: unknown;
  try {
    arr = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return undefined;
  }
  if (!Array.isArray(arr) || arr.length === 0) return undefined;
  const out: MediaHotspotTag[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const regionId = row.regionId;
    const type = row.type;
    const weight = row.weight;
    if (typeof regionId !== "string" || !isHotspotType(type)) continue;
    const w = typeof weight === "number" && Number.isFinite(weight) ? weight : 1;
    out.push({
      regionId,
      type,
      weight: Math.max(0.5, Math.min(2, w)),
      ...(typeof row.zoneId === "string" && row.zoneId.trim()
        ? { zoneId: row.zoneId.trim() }
        : {}),
    });
  }
  return out.length > 0 ? out : undefined;
}

export function normalizeHotspotTagsForSave(
  tags: MediaHotspotTag[] | null | undefined,
): MediaHotspotTag[] | null {
  if (!tags?.length) return null;
  return tags.map((t) => ({
    regionId: t.regionId,
    type: t.type,
    weight: Math.max(0.5, Math.min(2, t.weight || 1)),
    ...(t.zoneId ? { zoneId: t.zoneId } : {}),
  }));
}

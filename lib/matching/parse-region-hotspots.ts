import type { HotspotType, RegionHotspot } from "@/lib/matching/region-hotspot";

export type ParsedRegionHotspots = {
  value: RegionHotspot[];
  source: string | null;
};

type HotspotPattern = {
  type: HotspotType;
  weight: number;
  patterns: RegExp[];
};

/** STEP2 표 — 1차 regionId=jeju만 */
const HOTSPOT_PATTERNS: HotspotPattern[] = [
  {
    type: "residential",
    weight: 1.0,
    patterns: [/생활\s*권|주거|도민|거주|로컬\s*상권?/i],
  },
  {
    type: "transit_corridor",
    weight: 1.0,
    patterns: [/이동\s*동선|통근|버스\s*동선|교통\s*동선|이동\s*경로/i],
  },
  {
    type: "tourist",
    weight: 1.0,
    patterns: [/관광\s*객|관광/i],
  },
  {
    type: "airport",
    weight: 1.0,
    patterns: [/공항|airport/i],
  },
  {
    type: "commercial",
    weight: 0.8,
    patterns: [/상권|시내|번화가|중심\s*상권/i],
  },
];

const JEJU_RE = /제주/i;

/**
 * Freetext → RegionHotspot[] (jeju macro region만).
 * 제주 언급 없으면 빈 배열 — hotspot bonus 0.
 */
export function parseRegionHotspots(text: string): ParsedRegionHotspots {
  const trimmed = text.trim();
  if (!trimmed || !JEJU_RE.test(trimmed)) {
    return { value: [], source: null };
  }

  const hits: RegionHotspot[] = [];
  const sources: string[] = [];

  for (const row of HOTSPOT_PATTERNS) {
    for (const re of row.patterns) {
      const m = trimmed.match(re);
      if (m) {
        hits.push({
          regionId: "jeju",
          type: row.type,
          weight: row.weight,
        });
        sources.push(m[0]!);
        break;
      }
    }
  }

  /** 중복 type 제거 — 첫 매칭 유지 */
  const seen = new Set<HotspotType>();
  const deduped = hits.filter((h) => {
    if (seen.has(h.type)) return false;
    seen.add(h.type);
    return true;
  });

  return {
    value: deduped,
    source: sources.length > 0 ? sources.join(", ") : null,
  };
}

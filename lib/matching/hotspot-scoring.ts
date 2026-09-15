import type { MediaItem } from "@/lib/media-data";
import type {
  HotspotType,
  MediaHotspotTag,
  RegionHotspot,
} from "@/lib/matching/region-hotspot";

export type HotspotBonus = {
  /** catalog 엔진: −10~+10 */
  catalogPoints: number;
  /** brief 축: 0~100 (감점 시 0, rationale로 설명) */
  briefAxisScore: number;
  rationaleKo: string;
  rationaleEn: string;
};

const ADJACENT: ReadonlyArray<[HotspotType, HotspotType]> = [
  ["tourist", "airport"],
];

const CONFLICT: ReadonlyArray<[HotspotType, HotspotType]> = [
  ["residential", "airport"],
  ["residential", "tourist"],
];

function typeRelation(requested: HotspotType, media: HotspotType): number {
  if (requested === media) return 1.0;
  for (const [a, b] of ADJACENT) {
    if (
      (requested === a && media === b) ||
      (requested === b && media === a)
    ) {
      return 0.5;
    }
  }
  for (const [a, b] of CONFLICT) {
    if (
      (requested === a && media === b) ||
      (requested === b && media === a)
    ) {
      return -0.7;
    }
  }
  return 0;
}

function zoneMultiplier(
  req: RegionHotspot,
  tag: MediaHotspotTag,
): number {
  if (req.zoneId && tag.zoneId) {
    return req.zoneId === tag.zoneId ? 1.2 : 0.6;
  }
  if (req.regionId === tag.regionId) return 1.0;
  return 0;
}

function scorePair(req: RegionHotspot, tag: MediaHotspotTag): number {
  if (req.regionId !== "jeju" || tag.regionId !== "jeju") return 0;
  const rel = typeRelation(req.type, tag.type);
  if (rel === 0) return 0;
  const zoneMult = zoneMultiplier(req, tag);
  if (zoneMult === 0) return 0;
  return req.weight * tag.weight * rel * zoneMult;
}

/**
 * STEP2 알고리즘 — requested·media tags 모두 jeju 1차만.
 * requested 없거나 media.hotspotTags null/[] → null (bonus 0).
 */
export function computeHotspotBonus(
  media: MediaItem,
  requested: RegionHotspot[] | null | undefined,
): HotspotBonus | null {
  const tags = media.hotspotTags;
  if (!requested?.length || !tags?.length) return null;

  const jejuRequested = requested.filter((r) => r.regionId === "jeju");
  const jejuTags = tags.filter((t) => t.regionId === "jeju");
  if (jejuRequested.length === 0 || jejuTags.length === 0) return null;

  let raw = 0;
  const koParts: string[] = [];
  const enParts: string[] = [];

  for (const req of jejuRequested) {
    for (const tag of jejuTags) {
      const pair = scorePair(req, tag);
      if (pair === 0) continue;
      raw += pair;
      const sign = pair >= 0 ? "+" : "";
      koParts.push(`${req.type}↔${tag.type} ${sign}${pair.toFixed(1)}`);
      enParts.push(`${req.type}↔${tag.type} ${sign}${pair.toFixed(1)}`);
    }
  }

  if (raw === 0 && koParts.length === 0) {
    /** 매칭·갈등 모두 없음 */
    return null;
  }

  const catalogPoints = Math.max(-10, Math.min(10, Math.round(raw * 5)));
  const briefAxisScore = Math.max(
    0,
    Math.min(100, Math.round(((catalogPoints + 10) / 20) * 100)),
  );

  const rationaleKo =
    koParts.length > 0 ? koParts.join(" · ") : "생활권 hotspot";
  const rationaleEn =
    enParts.length > 0 ? enParts.join(" · ") : "Hotspot match";

  return { catalogPoints, briefAxisScore, rationaleKo, rationaleEn };
}

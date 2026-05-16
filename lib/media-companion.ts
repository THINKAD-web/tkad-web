import type { MediaItem } from "@/lib/media-data";
import { getSimilarMediaFromCatalog, haversineKm } from "@/lib/media-data";

/**
 * 같은 구(district) 우선, 없으면 동일 region — "함께 많이 보는" 추천 2~3건.
 */
export function getCompanionMediaFromCatalog(
  catalog: readonly MediaItem[],
  item: MediaItem,
  limit = 3,
): MediaItem[] {
  const others = catalog.filter((m) => m.id !== item.id);
  if (!others.length) return [];

  const district = item.district?.trim();
  const districtPool = district
    ? others.filter((m) => m.district?.trim() === district)
    : [];

  const regionPool =
    districtPool.length >= limit
      ? districtPool
      : others.filter((m) => m.region === item.region);

  const pool = regionPool.length >= 1 ? regionPool : others;

  const scored = pool
    .map((m) => ({
      m,
      d: haversineKm(item, m),
    }))
    .sort((a, b) => a.d - b.d);

  const byDistance = scored.slice(0, limit).map((x) => x.m);
  if (byDistance.length >= limit) return byDistance;

  const fallback = getSimilarMediaFromCatalog(
    [...catalog],
    item,
    limit,
    "score",
  ).filter((m) => !byDistance.some((x) => x.id === m.id));

  return [...byDistance, ...fallback].slice(0, limit);
}

import {
  chipToCategorySlugs,
  mediaMatchesCategorySlugs,
  mediaMatchesTargetSlugs,
  type BrowseCategoryChip,
} from "@/lib/media-categories";
import { expandMediaRegionChip } from "@/lib/media-discovery-filter-chips";
import type { MediaItem } from "@/lib/media-data";

function mediaSearchHaystack(m: MediaItem): string {
  return [
    m.name,
    m.nameEn,
    m.location,
    m.region,
    m.city,
    m.district,
    m.type,
    m.nearbyStations,
    m.nearbyLandmarks,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function matchesRegionChip(m: MediaItem, region: string): boolean {
  const trimmed = region.trim();
  if (!trimmed) return true;
  const aliases = expandMediaRegionChip(trimmed);
  const hay = mediaSearchHaystack(m);
  return aliases.some((alias) => hay.includes(alias.toLowerCase()));
}

function matchesCategoryChip(m: MediaItem, category: string): boolean {
  const trimmed = category.trim();
  if (!trimmed) return true;
  const slugs = chipToCategorySlugs(trimmed as BrowseCategoryChip);
  if (slugs.length === 0) return true;
  if (mediaMatchesCategorySlugs(m.mediaCategory, slugs)) return true;
  const typeHay = `${m.type ?? ""} ${m.subCategory ?? ""}`.toLowerCase();
  return slugs.some((s) => typeHay.includes(s));
}

function matchesTargetChip(m: MediaItem, target: string): boolean {
  const trimmed = target.trim();
  if (!trimmed) return true;
  return mediaMatchesTargetSlugs(m.targetCategory, [trimmed]);
}

/** 클라이언트 카탈로그 — 매체 검색·견적 위저드 칩 필터 */
export function filterMediaByDiscoveryChips(
  items: MediaItem[],
  opts: {
    category?: string;
    target?: string;
    region?: string;
    query?: string;
  },
): MediaItem[] {
  const q = opts.query?.trim().toLowerCase() ?? "";
  return items.filter((m) => {
    if (!matchesCategoryChip(m, opts.category ?? "")) return false;
    if (!matchesTargetChip(m, opts.target ?? "")) return false;
    if (!matchesRegionChip(m, opts.region ?? "")) return false;
    if (q.length > 0 && !mediaSearchHaystack(m).includes(q)) return false;
    return true;
  });
}

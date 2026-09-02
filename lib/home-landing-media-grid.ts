/**
 * Home planner landing — OOH / Digital coverage tiles from live catalog counts.
 * Not hardcoded: top-N updates when catalog distribution changes.
 */
import { unstable_cache } from "next/cache";
import { browseCategoryLabel, MEDIA_CATEGORIES } from "@/lib/media-browse-categories";
import { ONLINE_BROWSE_MAIN_SET } from "@/lib/online-browse-mains";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { fetchDigitalCatalogInternal } from "@/lib/planner/digital-catalog-fetch";
import type { DigitalCatalogItem } from "@/lib/planner/digital-catalog-types";
import { matchCatalogItemToPlatformId } from "@/lib/planner/digital-platform-map";
import {
  DIGITAL_CHANNELS,
  type DigitalChannelId,
} from "@/lib/planner/digital-channels";
import { THINKAD_DIGITAL_URL } from "@/lib/navigation/cross-brand";
import { publicActiveMediaWhere } from "@/lib/media-review-status";

export type HomeLandingOohTile = {
  kind: "ooh";
  subId: string;
  mainId: string;
  count: number;
  labelKo: string;
  labelEn: string;
  href: string;
};

export type HomeLandingDigitalTile = {
  kind: "digital";
  platformId: DigitalChannelId;
  count: number;
  labelKo: string;
  labelEn: string;
  href: string;
};

/** Browse mains that are OOH inventory (exclude online taxonomy mains). */
const OOH_BROWSE_MAIN_IDS = new Set(
  MEDIA_CATEGORIES.filter((m) => !ONLINE_BROWSE_MAIN_SET.has(m.id)).map(
    (m) => m.id,
  ),
);

const SUB_TO_MAIN = new Map<string, string>();
for (const main of MEDIA_CATEGORIES) {
  for (const sub of main.sub) {
    if (!SUB_TO_MAIN.has(sub.id)) SUB_TO_MAIN.set(sub.id, main.id);
  }
}

/** Fallback when DB groupBy is empty — matches 2026-07 prod distribution. */
export const FALLBACK_OOH_SUB_IDS = [
  "digital_signage",
  "subway_station",
  "airport",
] as const;

/** Fallback when Digital catalog fetch fails — Meta / Google / Naver by volume. */
export const FALLBACK_DIGITAL_PLATFORM_IDS: DigitalChannelId[] = [
  "meta",
  "google",
  "naver",
];

export function findBrowseMainForSub(subId: string): string | undefined {
  return SUB_TO_MAIN.get(subId);
}

export function isOohBrowseSub(subId: string): boolean {
  const main = findBrowseMainForSub(subId);
  return Boolean(main && OOH_BROWSE_MAIN_IDS.has(main));
}

export function buildOohTile(
  subId: string,
  count: number,
  locale = "ko",
): HomeLandingOohTile | null {
  const mainId = findBrowseMainForSub(subId);
  if (!mainId || !isOohBrowseSub(subId)) return null;
  return {
    kind: "ooh",
    subId,
    mainId,
    count,
    labelKo: browseCategoryLabel(subId, "ko", "sub", mainId),
    labelEn: browseCategoryLabel(subId, "en", "sub", mainId),
    href: `/media?mainCategory=${encodeURIComponent(mainId)}&subCategory=${encodeURIComponent(subId)}`,
  };
}

/** Pure: pick top N OOH subs from count map (catalog-driven). */
export function pickTopOohSubsFromCounts(
  counts: ReadonlyMap<string, number> | Record<string, number>,
  limit = 3,
): Array<{ subId: string; count: number }> {
  const entries =
    counts instanceof Map
      ? [...counts.entries()]
      : Object.entries(counts);
  return entries
    .filter(([subId, n]) => isOohBrowseSub(subId) && n > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([subId, count]) => ({ subId, count }));
}

/**
 * Map a Digital catalog row to a platform bucket for landing coverage.
 * Extends planner matcher with platform-string fallbacks (Naver GFA, etc.).
 */
export function resolveLandingDigitalPlatform(
  item: DigitalCatalogItem,
): DigitalChannelId | null {
  const mapped = matchCatalogItemToPlatformId(item);
  if (mapped) return mapped;

  const p = `${item.platform ?? ""} ${item.channel ?? ""}`.toLowerCase();
  if (p.includes("tiktok")) return "tiktok";
  if (p.includes("karrot") || p.includes("당근")) return "daangn";
  if (p.includes("buzzvil")) return "buzzvil";
  if (p.includes("naver")) return "naver";
  if (p.includes("kakao")) return "kakao";
  if (p.includes("youtube") || p.includes("google")) return "google";
  if (
    p.includes("meta") ||
    p.includes("instagram") ||
    p.includes("facebook") ||
    p.includes("advantage")
  ) {
    return "meta";
  }
  return null;
}

/** Pure: count Digital products by platform, return top N. */
export function pickTopDigitalPlatformsFromItems(
  items: readonly DigitalCatalogItem[],
  limit = 3,
): Array<{ platformId: DigitalChannelId; count: number }> {
  const counts = new Map<DigitalChannelId, number>();
  for (const item of items) {
    const id = resolveLandingDigitalPlatform(item);
    if (!id) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([platformId, count]) => ({ platformId, count }));
}

function digitalTileFor(
  platformId: DigitalChannelId,
  count: number,
): HomeLandingDigitalTile {
  const ch = DIGITAL_CHANNELS.find((c) => c.id === platformId);
  return {
    kind: "digital",
    platformId,
    count,
    labelKo: ch?.nameKo ?? platformId,
    labelEn: ch?.nameEn ?? platformId,
    href: THINKAD_DIGITAL_URL.replace(/\/$/, "") + "/media",
  };
}

async function loadOohTilesUncached(): Promise<HomeLandingOohTile[]> {
  if (!isDatabaseConfigured()) {
    return FALLBACK_OOH_SUB_IDS.map((id) => buildOohTile(id, 0)).filter(
      (t): t is HomeLandingOohTile => t != null,
    );
  }
  try {
    const rows = await getPrisma().media.groupBy({
      by: ["mediaSubCategory"],
      where: publicActiveMediaWhere({
        mediaSubCategory: { not: null },
      }),
      _count: { _all: true },
    });
    const counts = new Map<string, number>();
    for (const row of rows) {
      const sub = row.mediaSubCategory?.trim();
      if (!sub) continue;
      counts.set(sub, row._count._all);
    }
    const picked = pickTopOohSubsFromCounts(counts, 3);
    if (picked.length === 0) {
      return FALLBACK_OOH_SUB_IDS.map((id) => buildOohTile(id, 0)).filter(
        (t): t is HomeLandingOohTile => t != null,
      );
    }
    return picked
      .map(({ subId, count }) => buildOohTile(subId, count))
      .filter((t): t is HomeLandingOohTile => t != null);
  } catch (e) {
    console.error(
      "[home-landing-media-grid] ooh groupBy failed",
      e instanceof Error ? e.message : e,
    );
    return FALLBACK_OOH_SUB_IDS.map((id) => buildOohTile(id, 0)).filter(
      (t): t is HomeLandingOohTile => t != null,
    );
  }
}

async function loadDigitalTilesUncached(): Promise<HomeLandingDigitalTile[]> {
  const fetched = await fetchDigitalCatalogInternal();
  if (!fetched.ok) {
    return FALLBACK_DIGITAL_PLATFORM_IDS.map((id) => digitalTileFor(id, 0));
  }
  const picked = pickTopDigitalPlatformsFromItems(fetched.data.items, 3);
  if (picked.length === 0) {
    return FALLBACK_DIGITAL_PLATFORM_IDS.map((id) => digitalTileFor(id, 0));
  }
  return picked.map(({ platformId, count }) =>
    digitalTileFor(platformId, count),
  );
}

export const getHomeLandingOohTiles = unstable_cache(
  loadOohTilesUncached,
  ["home-landing-ooh-tiles-v1"],
  { revalidate: 3600, tags: ["home-landing-media-grid"] },
);

export const getHomeLandingDigitalTiles = unstable_cache(
  loadDigitalTilesUncached,
  ["home-landing-digital-tiles-v1"],
  { revalidate: 3600, tags: ["home-landing-media-grid"] },
);

export async function getHomeLandingCoverageTiles(): Promise<{
  ooh: HomeLandingOohTile[];
  digital: HomeLandingDigitalTile[];
}> {
  const [ooh, digital] = await Promise.all([
    getHomeLandingOohTiles(),
    getHomeLandingDigitalTiles(),
  ]);
  return { ooh, digital };
}

import {
  chipToCategorySlugs,
  mediaMatchesCategorySlugs,
  mediaMatchesTargetSlugs,
  type BrowseCategoryChip,
} from "@/lib/media-categories";
import { resolveBrowseCategoryParams } from "@/lib/media-browse-categories";
import { expandBrowseRegionSub } from "@/lib/media-browse-regions";
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

function matchesBrowseRegion(
  m: MediaItem,
  regionMain: string,
  regionSub: string,
  legacyRegion: string,
): boolean {
  if (regionSub.trim()) {
    if (m.regionSub === regionSub.trim()) return true;
    const aliases = expandBrowseRegionSub(regionSub);
    const hay = mediaSearchHaystack(m);
    return aliases.some((alias) => hay.includes(alias.toLowerCase()));
  }
  if (regionMain.trim()) {
    if (m.regionMain === regionMain.trim()) return true;
    const aliases = expandBrowseRegionSub(regionMain);
    const hay = mediaSearchHaystack(m);
    return aliases.some((alias) => hay.includes(alias.toLowerCase()));
  }
  const trimmed = legacyRegion.trim();
  if (!trimmed) return true;
  const aliases = expandMediaRegionChip(trimmed);
  const hay = mediaSearchHaystack(m);
  return aliases.some((alias) => hay.includes(alias.toLowerCase()));
}

function matchesBrowseCategory(
  m: MediaItem,
  mainCategory: string,
  subCategory: string,
  legacyCategory: string,
): boolean {
  const resolved = resolveBrowseCategoryParams({
    mainCategory,
    subCategory,
    category: legacyCategory,
  });
  if (resolved.subCategory) {
    if (m.mediaSubCategory === resolved.subCategory) return true;
    if (m.mediaCategory?.includes(resolved.subCategory)) return true;
  }
  if (resolved.mainCategory) {
    if (m.mediaMainCategory === resolved.mainCategory) return true;
    if (m.mediaCategory?.includes(resolved.mainCategory)) return true;
  }
  return matchesCategoryChip(m, legacyCategory);
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
function parsePriceWon(raw: string | undefined): number | null {
  if (!raw?.trim()) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function filterMediaByDiscoveryChips(
  items: MediaItem[],
  opts: {
    category?: string;
    mainCategory?: string;
    subCategory?: string;
    target?: string;
    region?: string;
    regionMain?: string;
    regionSub?: string;
    priceMin?: string;
    priceMax?: string;
    features?: string;
    query?: string;
  },
): MediaItem[] {
  const q = opts.query?.trim().toLowerCase() ?? "";
  const minP = parsePriceWon(opts.priceMin);
  const maxP = parsePriceWon(opts.priceMax);
  const featureSet = new Set(
    (opts.features ?? "")
      .split(/[,，]/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );

  return items.filter((m) => {
    if (
      !matchesBrowseCategory(
        m,
        opts.mainCategory ?? "",
        opts.subCategory ?? "",
        opts.category ?? "",
      )
    ) {
      return false;
    }
    if (!matchesTargetChip(m, opts.target ?? "")) return false;
    if (
      !matchesBrowseRegion(
        m,
        opts.regionMain ?? "",
        opts.regionSub ?? "",
        opts.region ?? "",
      )
    ) {
      return false;
    }
    if (minP != null && m.price < minP) return false;
    if (maxP != null && m.price > maxP) return false;
    if (featureSet.has("instant_booking") && !m.instantBookingEnabled) {
      return false;
    }
    if (
      featureSet.has("network") &&
      m.mediaMainCategory !== "network" &&
      !m.type?.toLowerCase().includes("network")
    ) {
      return false;
    }
    if (
      featureSet.has("24h") &&
      !m.operatingHours?.toLowerCase().includes("24")
    ) {
      return false;
    }
    if (q.length > 0 && !mediaSearchHaystack(m).includes(q)) return false;
    return true;
  });
}

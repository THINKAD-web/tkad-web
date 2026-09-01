import {
  chipToCategorySlugs,
  mediaMatchesCategorySlugs,
  mediaMatchesTargetSlugs,
  type BrowseCategoryChip,
} from "@/lib/media-categories";
import { resolveBrowseCategoryParams } from "@/lib/media-browse-categories";
import { expandMediaRegionChip } from "@/lib/media-discovery-filter-chips";
import {
  aliasHaystackForeignSidoConflict,
  aliasMatchesHaystackToken,
  browseSubHaystackAliases,
  mediaMatchesBrowseRegionHaystackFallback,
  mediaRegionAliasHaystack,
} from "@/lib/media-browse-region-haystack-match";
import {
  mediaMatchesCoverageRegion,
  resolveRegionFilterSigunguCodes,
} from "@/lib/media-map/coverage-region-match";
import { getBrowseRegionMain } from "@/lib/media-browse-regions";
import { resolveBrowseRegionSubId } from "@/lib/plan-cart-report/region-subdivision";
import type { MediaItem } from "@/lib/media-data";
import { matchesMediaTextQuery } from "@/lib/media-data";

function mediaMatchesBrowseRegionSub(
  m: MediaItem,
  canonicalSub: string,
): boolean {
  if (m.regionSub?.trim() === canonicalSub) return true;
  for (const loc of m.networkLocations ?? []) {
    if (loc.regionSub?.trim() === canonicalSub) return true;
  }
  return false;
}

function matchesBrowseRegionHaystackLegacy(
  m: MediaItem,
  regionMain: string,
  aliases: readonly string[],
): boolean {
  const main = regionMain.trim();
  const hay = mediaRegionAliasHaystack(m);
  if (main && aliasHaystackForeignSidoConflict(hay, main)) return false;

  const mediaMain = m.regionMain?.trim();
  if (
    mediaMain &&
    main &&
    mediaMain !== main &&
    mediaMain !== "national" &&
    main !== "national"
  ) {
    return false;
  }

  return aliases.some((alias) => aliasMatchesHaystackToken(alias, hay));
}

export function matchesBrowseRegion(
  m: MediaItem,
  regionMain: string,
  regionSub: string,
  legacyRegion: string,
): boolean {
  const coverageFilter = resolveRegionFilterSigunguCodes({
    regionMain,
    regionSub,
    legacyRegion,
  });

  // ① regionSub / regionMain 태그 정확 일치
  if (regionSub.trim()) {
    const trimmed = regionSub.trim();
    const canonicalSub = resolveBrowseRegionSubId(trimmed);
    if (canonicalSub) {
      if (mediaMatchesBrowseRegionSub(m, canonicalSub)) return true;
    } else if (m.regionSub === trimmed) {
      return true;
    }
  } else if (regionMain.trim()) {
    if (m.regionMain === regionMain.trim()) return true;
  } else if (!legacyRegion.trim()) {
    return true;
  }

  // ② coverage codes 매칭
  if (mediaMatchesCoverageRegion(m, coverageFilter)) return true;

  // ③ haystack alias fallback (coverage 비어있거나 실패 시)
  if (regionSub.trim()) {
    return mediaMatchesBrowseRegionHaystackFallback(
      m,
      regionMain,
      regionSub.trim(),
      coverageFilter,
    );
  }

  if (regionMain.trim()) {
    const main = getBrowseRegionMain(regionMain.trim());
    if (!main) return false;
    const aliases = main.sub.flatMap((s) => browseSubHaystackAliases(s));
    return matchesBrowseRegionHaystackLegacy(m, regionMain, aliases);
  }

  const aliases = expandMediaRegionChip(legacyRegion.trim());
  return matchesBrowseRegionHaystackLegacy(m, "", aliases);
}

function matchesBrowseCategory(
  m: MediaItem,
  mainCategory: string,
  subCategory: string,
  legacyCategory: string,
): boolean {
  const mainTrim = mainCategory.trim();
  const subTrim = subCategory.trim();
  const legacyTrim = legacyCategory.trim();
  /** URL `mainCategory` / `subCategory` — browse 칩 직접 선택 */
  const browseParamsRequested = Boolean(mainTrim || subTrim);

  const resolved = resolveBrowseCategoryParams({
    mainCategory: mainTrim || undefined,
    subCategory: subTrim || undefined,
    category: legacyTrim || undefined,
  });

  const matchesMain = (): boolean => {
    if (!resolved.mainCategory) return true;
    if (m.mediaMainCategory === resolved.mainCategory) return true;
    if (m.mediaCategory?.includes(resolved.mainCategory)) return true;
    return false;
  };

  if (resolved.subCategory) {
    const subMatch =
      m.mediaSubCategory === resolved.subCategory ||
      Boolean(m.mediaCategory?.includes(resolved.subCategory));
    if (!subMatch) return false;
    // Prisma buildPublicMediaWhere 와 동일 — sub 요청 시 main 폴백 통과 금지, 둘 다 있으면 AND
    return matchesMain();
  }
  if (resolved.mainCategory) {
    if (matchesMain()) return true;
  }

  // browse taxonomy로 필터가 걸렸는데 매칭 실패
  if (resolved.subCategory || resolved.mainCategory) {
    // browse 칩(main/sub) 직접 요청 → 전량 통과 금지
    if (browseParamsRequested) return false;
    // legacy 칩만 요청 → slug·type 텍스트 매칭 폴백
    if (legacyTrim) return matchesCategoryChip(m, legacyTrim);
    return false;
  }

  if (legacyTrim) return matchesCategoryChip(m, legacyTrim);
  return true;
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

/** `features` 쿼리에서 network 토글 — 기존 instant_booking·24h 등은 유지 */
export function setFeaturesNetworkEnabled(
  features: string,
  enabled: boolean,
): string {
  const parts = new Set(
    features
      .split(/[,，]/)
      .map((s) => s.trim())
      .filter(Boolean),
  );
  if (enabled) parts.add("network");
  else parts.delete("network");
  return [...parts].join(",");
}

/** 클라이언트 카탈로그 — 매체 검색·견적 위저드 칩 필터 */
export function discoveryFeaturesIncludeNetwork(
  features: string | null | undefined,
): boolean {
  if (!features?.trim()) return false;
  return features
    .split(/[,，]/)
    .map((s) => s.trim().toLowerCase())
    .includes("network");
}

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
      m.catalogSource !== "network" &&
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
    if (q.length > 0 && !matchesMediaTextQuery(m, q)) return false;
    return true;
  });
}

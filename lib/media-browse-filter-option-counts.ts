import { MEDIA_CATEGORIES } from "@/lib/media-browse-categories";
import { MEDIA_BROWSE_REGIONS } from "@/lib/media-browse-regions";
import { filterMediaByDiscoveryChips } from "@/lib/media-discovery-client-filter";
import type { MediaItem } from "@/lib/media-data";

export type BrowseFilterOptionCounts = {
  /** browse main id → 매칭 건수 (main 단위; 0이면 칩 미표시) */
  mainCategory: Record<string, number>;
  /** `mainId/subId` → 매칭 건수 */
  subCategory: Record<string, number>;
  /** `regionMainId/regionSubId` → 매칭 건수 */
  regionSub: Record<string, number>;
  /** `features=network` 매칭 건수 */
  networkFeature: number;
};

/** 공개 카탈로그 기준 서브카테고리·지역 소분류 옵션별 매칭 건수 */
export function buildBrowseFilterOptionCounts(
  items: MediaItem[],
): BrowseFilterOptionCounts {
  const mainCategory: Record<string, number> = {};
  const subCategory: Record<string, number> = {};
  for (const main of MEDIA_CATEGORIES) {
    if (main.id === "network") continue;
    mainCategory[main.id] = filterMediaByDiscoveryChips(items, {
      mainCategory: main.id,
    }).length;
    for (const sub of main.sub) {
      const key = `${main.id}/${sub.id}`;
      subCategory[key] = filterMediaByDiscoveryChips(items, {
        mainCategory: main.id,
        subCategory: sub.id,
      }).length;
    }
  }

  const regionSub: Record<string, number> = {};
  for (const main of MEDIA_BROWSE_REGIONS) {
    for (const sub of main.sub) {
      const key = `${main.id}/${sub.id}`;
      regionSub[key] = filterMediaByDiscoveryChips(items, {
        regionMain: main.id,
        regionSub: sub.id,
      }).length;
    }
  }

  return {
    mainCategory,
    subCategory,
    regionSub,
    networkFeature: filterMediaByDiscoveryChips(items, { features: "network" })
      .length,
  };
}

export function browseMainCategoryCount(
  counts: BrowseFilterOptionCounts | null | undefined,
  mainId: string,
): number | null {
  if (!counts) return null;
  return counts.mainCategory[mainId] ?? 0;
}

export function browseSubCategoryCount(
  counts: BrowseFilterOptionCounts | null | undefined,
  mainId: string,
  subId: string,
): number | null {
  if (!counts) return null;
  return counts.subCategory[`${mainId}/${subId}`] ?? 0;
}

export function browseRegionSubCount(
  counts: BrowseFilterOptionCounts | null | undefined,
  regionMainId: string,
  regionSubId: string,
): number | null {
  if (!counts) return null;
  return counts.regionSub[`${regionMainId}/${regionSubId}`] ?? 0;
}

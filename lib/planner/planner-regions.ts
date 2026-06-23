import {
  browseRegionLabel,
  listBrowseRegionMains,
  type BrowseRegionMain,
} from "@/lib/media-browse-regions";
import { expandBrowseRegionSub } from "@/lib/media-browse-regions";
import { matchesBrowseRegion } from "@/lib/media-discovery-client-filter";
import { mediaRegionHaystack } from "@/lib/media-region-haystack";
import {
  matchesPlannerCategory,
  type PlannerCategory,
} from "@/lib/planner-logic";
import type { MediaItem } from "@/lib/media-data";

/** 플래너 지도·칩에 노출할 광역 (browse taxonomy `id`) */
export type PlannerRegionId = string;

export type PlannerRegionOption = {
  id: PlannerRegionId;
  labelKo: string;
  labelEn: string;
  count: number;
};

/** SVG 지도에 고정된 레거시 4권역 (시각 힌트용) */
export const PLANNER_MAP_ANCHOR_IDS = [
  "seoul",
  "busan",
  "jeju",
  "national",
] as const;

export type PlannerMapAnchorId = (typeof PLANNER_MAP_ANCHOR_IDS)[number];

export function isPlannerMapAnchorId(id: string): id is PlannerMapAnchorId {
  return (PLANNER_MAP_ANCHOR_IDS as readonly string[]).includes(id);
}

const LEGACY_MACRO_REGIONS = new Set(["seoul", "busan", "jeju", "national"]);

/** 레거시 `region`이 browse `regionMain`과 충돌하면 매칭·표시에서 레거시 무시 */
export function legacyRegionConflictsWithRegionMain(
  legacy: string,
  regionMain: string | undefined,
): boolean {
  const main = regionMain?.trim();
  if (!main || legacy === main) return false;
  if (legacy === "national") return false;
  if (
    (legacy === "seoul" || legacy === "busan" || legacy === "jeju") &&
    main !== legacy
  ) {
    return true;
  }
  return false;
}

export function listPlannerBrowseRegionMains(): BrowseRegionMain[] {
  return listBrowseRegionMains();
}

/** 매체 1건이 플래너 지역(광역) 선택과 일치하는지 — `regionMain` 우선, 레거시 `region` 보조 */
export function matchesPlannerRegion(
  media: MediaItem,
  regionId: string,
): boolean {
  const id = regionId.trim();
  if (!id) return true;

  const regionMain = media.regionMain?.trim();

  if (regionMain) {
    if (regionMain === id) return true;
    if (id === "national" && regionMain === "national") return true;
    // regionMain이 다른 광역이면 haystack 별칭(중구 등) 오매칭·레거시 seoul 통과 차단
  } else if (matchesBrowseRegion(media, id, "", "")) {
    return true;
  }

  const legacy = media.region?.trim();
  if (
    legacy &&
    legacy === id &&
    LEGACY_MACRO_REGIONS.has(legacy) &&
    !legacyRegionConflictsWithRegionMain(legacy, regionMain)
  ) {
    return true;
  }

  /** 레거시 `national` 버킷 + `regionMain` 세분 — 경기·인천 등 */
  if (legacy === "national" && regionMain === id) return true;

  if (id === "national" && legacy === "national" && !regionMain) {
    return true;
  }

  if (media.catalogSource === "network" || media.id.startsWith("nw_")) {
    const hay = mediaRegionHaystack(media);
    const aliases = expandBrowseRegionSub(id);
    if (aliases.some((alias) => hay.includes(alias.toLowerCase()))) {
      return true;
    }
    for (const loc of media.networkLocations ?? []) {
      if (loc.regionMain?.trim() === id) return true;
      if (loc.regionSub?.trim() === id) return true;
      if (
        loc.regionMain &&
        matchesBrowseRegion(
          { ...media, regionMain: loc.regionMain, regionSub: loc.regionSub },
          id,
          "",
          "",
        )
      ) {
        return true;
      }
    }
  }

  return false;
}

export function filterPlannerMediaByRegions(
  items: readonly MediaItem[],
  regions: ReadonlySet<string>,
  categories: ReadonlySet<PlannerCategory>,
): MediaItem[] {
  if (categories.size === 0) return [];
  if (regions.size === 0) {
    return items.filter((m) => {
      for (const c of categories) {
        if (matchesPlannerCategory(m, c)) return true;
      }
      return false;
    });
  }
  return items.filter((m) => {
    if (![...regions].some((r) => matchesPlannerRegion(m, r))) return false;
    for (const c of categories) {
      if (matchesPlannerCategory(m, c)) return true;
    }
    return false;
  });
}

export function countPlannerMediaByBrowseRegion(
  items: readonly MediaItem[],
  categories: ReadonlySet<PlannerCategory>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const main of listBrowseRegionMains()) out[main.id] = 0;

  if (categories.size === 0) return out;

  for (const m of items) {
    let catMatch = false;
    for (const c of categories) {
      if (matchesPlannerCategory(m, c)) {
        catMatch = true;
        break;
      }
    }
    if (!catMatch) continue;

    let matched = false;
    for (const main of listBrowseRegionMains()) {
      if (matchesPlannerRegion(m, main.id)) {
        out[main.id] = (out[main.id] ?? 0) + 1;
        matched = true;
      }
    }
    if (!matched && m.region) {
      out[m.region] = (out[m.region] ?? 0) + 1;
    }
  }
  return out;
}

export function buildPlannerRegionOptions(
  counts: Record<string, number>,
  locale = "ko",
): PlannerRegionOption[] {
  const isKo = locale.startsWith("ko");
  return listBrowseRegionMains()
    .map((main) => ({
      id: main.id,
      labelKo: main.label,
      labelEn: main.labelEn ?? main.label,
      count: counts[main.id] ?? 0,
    }))
    .filter((opt) => opt.count > 0)
    .sort((a, b) => b.count - a.count || a.labelKo.localeCompare(b.labelKo, "ko"));
}

export function plannerRegionLabel(
  regionId: string,
  locale = "ko",
  nationalShort?: string,
): string {
  if (regionId === "national" && nationalShort) return nationalShort;
  return browseRegionLabel(regionId, locale, "main");
}

/** 추천 카드·플래너 — browse `regionMain`/`regionSub` 우선, 레거시 `region` 폴백 */
export function mediaPlannerRegionDisplayLabel(
  media: MediaItem,
  locale = "ko",
  nationalShort?: string,
): string {
  const main = media.regionMain?.trim();
  const sub = media.regionSub?.trim();
  if (main) {
    const mainLabel = browseRegionLabel(main, locale, "main");
    if (sub) {
      const subLabel = browseRegionLabel(sub, locale, "sub", main);
      if (subLabel && subLabel !== mainLabel) {
        return `${mainLabel} · ${subLabel}`;
      }
    }
    return mainLabel;
  }
  const legacy = media.region?.trim();
  if (legacy) {
    return plannerRegionLabel(legacy, locale, nationalShort);
  }
  return "";
}
